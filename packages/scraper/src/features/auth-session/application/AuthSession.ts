import readline from "readline";
import type { BrowserContext, Frame, Page, Response } from "playwright";

import { type ILogger } from '@core/logging';
import { type IUseCase, type Result } from '@scraper/features/shared';
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

export class AuthSession implements IUseCase<AuthSessionInput, Result> {
  private browserProvider: IBrowserProvider;
  private authStorage: IAuthSessionStorage;
  private validator: IAuthValidator;
  private logger: ILogger;
  private activeContext: BrowserContext | null = null;
  private lastUserStatus: string | null = null;
  public isLoginDetected: boolean = false;
  public isLoggingIn: boolean = false;

  constructor(options: AuthSessionOptions) {
    this.browserProvider = options.browserProvider;
    this.authStorage = options.authStorage;
    this.validator = options.validator;
    this.logger = options.logger.withContext("AuthSession");
  }

  async execute(input: AuthSessionInput = {}): Promise<Result> {
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

    this.activeContext = await this.browserProvider.getHeadfulContext({ headless });
    if (!this.activeContext) {
      return { success: false, error: "No se pudo obtener el contexto del navegador." };
    }

    // --- MONITOR DE SESIÓN (Basado en Logs Nativos) ---
    this.isLoggingIn = true;
    this.lastUserStatus = null;

    // Monitorizar páginas existentes y futuras
    const pages = await this.activeContext.pages();
    pages.forEach(page => this.setupPageMonitoring(page, interactive));
    this.activeContext.on('page', page => this.setupPageMonitoring(page, interactive));

    // Intercepción de red para Cookies de Servidor
    this.setupContextMonitoring();

    const page = pages[0] || (await this.activeContext.newPage());
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

      return new Promise<Result>((resolve) => {
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
            process.stdin.removeListener('keypress', handleKeypress);
            await this.closeAndCleanup(autoSaveInterval, resolve);
          }
        };

        process.stdin.on('keypress', handleKeypress);
      }).finally(() => {
        this.isLoggingIn = false;
      });
    } else {
      this.logger.info("Navegador abierto. Completa el login en la ventana y pulsa 'Confirmar y Guardar' en la web.");

      await this.activeContext.exposeFunction('finishAuthSession', async () => {
        const result = await this.saveActiveSession();
        return result.success;
      });

      page.on('load', () => {
        this.logger.info("LMS Offline: Sesión de autenticación cargada.");
      });

      page.on('framenavigated', (frame: Frame) => {
        if (frame === page.mainFrame()) {
          const url = page.url();
          this.logger.info(`[Navigation] URL: ${url}`);

          // Detectar si volvemos al login inesperadamente usando el validador
          const isLogin = this.validator.isLoginPage({ url });

          if (isLogin) {
            this.logger.warn(`[Navigation] Posible pérdida de sesión detectada por URL.`);
          }
        }
      });

      return new Promise<Result>((resolve) => {
        page.on('close', async () => {
          await this.closeAndCleanup(autoSaveInterval, resolve);
        });
      }).finally(() => {
        this.isLoggingIn = false;
      });
    }
  }

  async saveActiveSession(): Promise<Result> {
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

  private setupContextMonitoring(): void {
    if (!this.activeContext) return;

    this.activeContext.on('response', (response: Response) => {
      const setCookie = response.headers()['set-cookie'];
      if (setCookie) {
        this.logger.debug?.(`[Network] Cookie detectada en: ${response.url().substring(0, 50)}...`);
      }
    });
  }

  private setupPageMonitoring(page: Page, interactive: boolean): void {
    page.on('console', (msg: any) => {
      const text = msg.text();

      if (text.includes('joinedRoom')) {
        const isGuest = text.includes('"roomId":"guest"');
        const match = text.match(/"roomId":"([^"]*)"/);
        const userId = match?.[1] || (isGuest ? 'guest' : 'desconocido');

        if (userId !== this.lastUserStatus) {
          this.lastUserStatus = userId;

          if (isGuest) {
            this.logger.info("🔥 [SISTEMA] Estado detectado: Invitado (Sesión Cerrada).");
            this.isLoginDetected = false;
            this.saveActiveSession().catch(e => this.logger.error(`Error al limpiar sesión: ${e.message}`, e));
          } else {
            this.logger.info(`🔥 [SISTEMA] ¡LOGIN DETECTADO! Usuario: ${userId}`);
            this.isLoginDetected = true;

            if (interactive) {
              this.logger.info("👉 Ya puedes pulsar 'ENTER' en esta terminal para guardar la sesión.");
            } else {
              this.logger.info("👉 Pulsa 'Confirmar y Guardar' en la interfaz web.");
            }
            this.saveActiveSession().catch(e => this.logger.error(`Error en autoguardado: ${e.message}`, e));
          }
        }
      }

      if (msg.type() === 'error') {
        this.logger.info(`[Browser-Error] ${text}`);
      } else {
        this.logger.debug?.(`[Browser-${msg.type()}] ${text}`);
      }
    });

    page.on('frameattached', (frame: any) => {
      this.logger.debug?.(`[Navigation] Nuevo Frame detectado en ${page.url().substring(0, 30)}: ${frame.url() || 'cargando...'}`);
    });
  }

  private async closeAndCleanup(autoSaveInterval: NodeJS.Timeout, resolve: (res: Result) => void): Promise<void> {
    clearInterval(autoSaveInterval);
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
    if (this.activeContext) {
      await this.browserProvider.closeContext(this.activeContext);
    }
    resolve({ success: true });
  }
}
