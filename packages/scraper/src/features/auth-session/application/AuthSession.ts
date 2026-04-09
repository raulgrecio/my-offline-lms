import readline from "readline";

import { type ILogger } from '@core/logging';
import { type IUseCase } from '@scraper/features/shared';
import { PLATFORM } from "@scraper/config";
import { type IBrowserProvider } from "@scraper/platform/browser";

import { type IAuthSessionStorage } from "../domain/ports/IAuthSessionStorage";
import { type IAuthValidator } from "../domain/ports/IAuthValidator";

export interface AuthSessionInput {
  baseUrl?: string;
  interactive?: boolean;
  headless?: boolean;
}

export interface AuthSessionOptions {
  browserProvider: IBrowserProvider;
  authStorage: IAuthSessionStorage;
  validator: IAuthValidator;
  logger: ILogger;
}

export class AuthSession implements IUseCase<AuthSessionInput, void> {
  private browserProvider: IBrowserProvider;
  private authStorage: IAuthSessionStorage;
  private validator: IAuthValidator;
  private logger: ILogger;
  private activeContext: any = null;
  public isLoginDetected: boolean = false;

  constructor(options: AuthSessionOptions) {
    this.browserProvider = options.browserProvider;
    this.authStorage = options.authStorage;
    this.validator = options.validator;
    this.logger = options.logger.withContext("AuthSession");
  }

  async execute(input: AuthSessionInput = {}): Promise<void> {
    const {
      baseUrl = PLATFORM.BASE_URL,
      interactive = true,
      headless = !interactive
    } = input;

    this.isLoginDetected = false;
    await this.authStorage.ensureAuthDir();

    this.logger.info(`Iniciando sesión de autenticación para: ${baseUrl}`);

    const cookies = await this.authStorage.getCookies();
    const isSessionValidForLoading = this.validator.isValid(cookies);
    const context = await this.browserProvider.getHeadfulContext({ headless });
    this.activeContext = context;

    // --- MONITOR DE SESIÓN (Basado en Logs Nativos) ---
    const page = await context.newPage();
    let lastUserStatus: string | null = null;

    page.on('console', msg => {
      const text = msg.text();

      // Detección de Sala (Login/Logout Oficial)
      if (text.includes('joinedRoom')) {
        const isGuest = text.includes('"roomId":"guest"');
        const match = text.match(/"roomId":"([^"]*)"/);
        const userId = match?.[1] || (isGuest ? 'guest' : 'desconocido');

        // Solo loguear si el estado ha cambiado para evitar duplicados en la terminal
        if (userId !== lastUserStatus) {
          lastUserStatus = userId;

          if (isGuest) {
            this.logger.info("🔥 [SISTEMA] Estado detectado: Invitado (Sesión Cerrada).");
            this.isLoginDetected = false;

            // Ahora, al detectar el logout explícito, forzamos el auto-guardado para borrar el rastro previo
            this.saveActiveSession().catch(e => this.logger.error(`Error al limpiar sesión: ${e.message}`, e));
          } else {
            this.logger.info(`🔥 [SISTEMA] ¡LOGIN DETECTADO! Usuario: ${userId}`);
            this.logger.info("👉 Ya puedes pulsar 'ENTER' en esta terminal para guardar la sesión.");

            this.isLoginDetected = true;

            // Ahora, al detectar el login explícito, forzamos el auto-guardado para guardar el rastro
            this.saveActiveSession().catch(e => this.logger.error(`Error en autoguardado: ${e.message}`, e));
          }
        }
      }

      // Redirigir logs generales al sistema de logging persistente
      if (msg.type() === 'error') {
        this.logger.info(`[Browser-Error] ${text}`);
      } else {
        this.logger.debug?.(`[Browser-${msg.type()}] ${text}`);
      }
    });

    page.on('frameattached', frame => {
      this.logger.debug?.(`[Navigation] Nuevo Frame detectado: ${frame.url() || 'cargando...'}`);
    });

    // Intercepción de red para Cookies de Servidor
    context.on('response', (response: any) => {
      const setCookie = response.headers()['set-cookie'];
      if (setCookie) {
        this.logger.debug?.(`[Network] Cookie detectada en: ${response.url().substring(0, 50)}...`);
      }
    });

    this.logger.info("📡 Monitoreo de sesión nativo activado (Basado en logs).");

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
      this.logger.info("👉 PRESIONA 'ENTER' PARA GUARDAR LA SESIÓN");
      this.logger.info("👉 PRESIONA 'ESC' o 'Ctrl+C' PARA SALIR Y CERRAR EL NAVEGADOR");
      this.logger.info("========================================================");

      readline.emitKeypressEvents(process.stdin);
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
      }

      return new Promise((resolve) => {
        const handleInput = async () => {
          this.logger.info("💾 Guardando sesión...");
          await this.saveActiveSession();
        };

        const handleKeypress = async (_: any, key: any) => {
          if (key && (key.name === 'return' || key.name === 'enter')) {
            await handleInput();
            return;
          }
          if (key && (key.name === 'escape' || (key.ctrl && key.name === 'c'))) {
            this.logger.info("Saliendo y cerrando navegador...");
            clearInterval(autoSaveInterval);
            if (process.stdin.isTTY) process.stdin.setRawMode(false);
            process.stdin.removeListener('keypress', handleKeypress);
            await this.browserProvider.closeContext(context);
            resolve();
          }
        };

        process.stdin.on('keypress', handleKeypress);
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
          const url = page.url();
          this.logger.info(`[Navigation] URL: ${url}`);
          // Detectar si volvemos al login inesperadamente
          if (url.includes('/login') || url.includes('/idp/') || url.includes('error=unauthorized')) {
            this.logger.warn(`[Navigation] Posible pérdida de sesión detectada por URL.`);
          }
        }
      });

      return new Promise((resolve) => {
        page.on('close', async () => {
          clearInterval(autoSaveInterval);
          await this.browserProvider.closeContext(context);
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
