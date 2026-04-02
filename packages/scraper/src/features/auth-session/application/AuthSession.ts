import readline from "readline";
import { type ILogger } from '@core/logging';
import { type IUseCase } from '@scraper/features/shared';
import { type IBrowserProvider } from "@scraper/platform/browser";
import { type IAuthSessionStorage } from "../domain/ports/IAuthSessionStorage";
import { PLATFORM } from "@scraper/config";

export interface AuthSessionInput {
  baseUrl?: string;
  interactive?: boolean;
  headless?: boolean;
}

export interface AuthSessionOptions {
  browserProvider: IBrowserProvider;
  authStorage: IAuthSessionStorage;
  logger: ILogger;
}

export class AuthSession implements IUseCase<AuthSessionInput, void> {
  private browserProvider: IBrowserProvider;
  private authStorage: IAuthSessionStorage;
  private logger: ILogger;
  private activeContext: any = null;

  constructor(options: AuthSessionOptions) {
    this.browserProvider = options.browserProvider;
    this.authStorage = options.authStorage;
    this.logger = options.logger.withContext("AuthSession");
  }

  async execute(input: AuthSessionInput = {}): Promise<void> {
    const {
      baseUrl = PLATFORM.URL_PATTERNS.LOGIN_URL,
      interactive = true,
      headless = !interactive
    } = input;

    await this.authStorage.ensureAuthDir();

    this.logger.info(`Iniciando sesión de autenticación para: ${baseUrl}`);

    const isSessionValidForLoading = await this.authStorage.isValidSession();
    const context = await this.browserProvider.getHeadfulContext(headless);
    this.activeContext = context;
    const page = await context.newPage();

    if (isSessionValidForLoading) {
      this.logger.info("👉 Se ha cargado una sesión previa detectada como válida.");
    }

    this.logger.info(`Navegando a ${baseUrl}`);

    await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Auto-save cada 15 min para evitar expiración inesperada
    const autoSaveInterval = setInterval(async () => {
      await this.saveActiveSession();
    }, 15 * 60 * 1000);

    if (interactive) {
      this.logger.info("========================================================");
      this.logger.info("👉 INICIA SESIÓN EN EL NAVEGADOR");
      this.logger.info("👉 ASEGÚRATE DE ESTAR EN LA PÁGINA DE CURSO");
      this.logger.info("👉 PRESIONA 'ENTER' PARA GUARDAR LA SESIÓN");
      this.logger.info("👉 PRESIONA 'ESC' o 'Ctrl+C' PARA SALIR Y CERRAR EL NAVEGADOR");
      this.logger.info("========================================================");

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      return new Promise((resolve) => {
        const handleInput = async (input: string) => {
          if (input === "") {
            this.logger.info("💾 Guardando sesión...");
            await this.saveActiveSession();
            clearInterval(autoSaveInterval);
            rl.close();
            resolve();
          }
        };

        const handleKeypress = async (_: any, key: any) => {
          if (key && (key.name === 'return' || key.name === 'enter')) {
            await handleInput("");
            return;
          }
          if (key && (key.name === 'escape' || (key.ctrl && key.name === 'c'))) {
            this.logger.info("Saliendo y cerrando navegador...");
            clearInterval(autoSaveInterval);
            await this.browserProvider.close();
            rl.close();
            resolve();
          }
        };

        process.stdin.on('keypress', handleKeypress);
        rl.on('line', handleInput);
      });
    } else {
      this.logger.info("Navegador abierto. Completa el login en la ventana y pulsa 'Confirmar y Guardar' en la web.");

      await context.exposeFunction('finishAuthSession', async () => {
        const result = await this.saveActiveSession();
        return result.success;
      });

      page.on('load', () => {
        this.logger.info("LMS Offline: Sesión de autenticación cargada.");
      });

      page.on('framenavigated', (frame: any) => {
        if (frame === page.mainFrame()) {
          this.logger.info(`LMS Offline: Navegación detectada -> ${page.url()}`);
        }
      });

      return new Promise((resolve) => {
        page.on('close', async () => {
          clearInterval(autoSaveInterval);
          await this.browserProvider.close();
          resolve();
        });
      });
    }
  }

  async saveActiveSession(): Promise<{ success: boolean; error?: string }> {
    if (!this.activeContext) {
      return { success: false, error: "No hay sesión activa para guardar." };
    }

    this.logger.info("Guardando estado de la sesión y cookies...");
    try {
      const authFile = await this.authStorage.getAuthFile();
      await this.activeContext.storageState({ path: authFile });

      const cookies = await this.activeContext.cookies();
      await this.authStorage.saveCookies(cookies);

      this.logger.info("✅ Sesión y cookies guardadas con éxito.");
      return { success: true };
    } catch (e: any) {
      this.logger.error(`Error al guardar la sesión: ${e.message}`, e);
      return { success: false, error: e.message };
    }
  }
}
