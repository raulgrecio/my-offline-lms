import readline from "readline";
import { ILogger } from "@domain/services/ILogger";
import { IAuthSessionStorage } from "@domain/repositories/IAuthSessionStorage";
import { BrowserProvider } from "@infrastructure/browser/BrowserProvider";

export class AuthSession {
  private browserProvider: BrowserProvider;
  private authStorage: IAuthSessionStorage;
  private logger: ILogger;

  constructor(deps: {
    browserProvider: BrowserProvider,
    authStorage: IAuthSessionStorage,
    logger: ILogger
  }) {
    this.browserProvider = deps.browserProvider;
    this.authStorage = deps.authStorage;
    this.logger = deps.logger.withContext("AuthSession");
  }

  async interactiveLogin(targetUrl: string): Promise<void> {
    this.authStorage.ensureAuthDir();

    this.logger.info(`Iniciando navegador interactivo para: ${targetUrl}`);
    const context = await this.browserProvider.getHeadfulContext(false);
    const page = await context.newPage();

    this.logger.info(`Navegando a ${targetUrl}`);
    this.logger.info("Por favor, realiza el login (incluyendo 2FA) en la ventana del navegador.");

    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    this.logger.info("========================================================", "");
    this.logger.info("👉 PRESIONA 'ENTER' PARA GUARDAR LA SESIÓN (puedes hacerlo varias veces)");
    this.logger.info("👉 PRESIONA 'ESC' o 'Ctrl+C' PARA SALIR Y CERRAR EL NAVEGADOR");
    this.logger.info("========================================================", "");

    const saveSession = async () => {
      this.logger.info("Guardando estado de la sesión y cookies... (Automático / Manual)");
      try {
        await context.storageState({ path: this.authStorage.getAuthFile() });

        const cookies = await context.cookies();
        this.authStorage.saveCookies(cookies);

        this.logger.info("✅ Sesión y cookies guardadas con éxito en data/.auth/");
      } catch (e) {
        this.logger.error("❌ Error al guardar sesión:", e);
      }
    };

    // Autoguardado silencioso cada 15 minutos
    const autoSaveInterval = setInterval(() => {
      saveSession().catch(console.error);
    }, 15 * 60 * 1000);

    await new Promise<void>((resolve) => {
      process.stdin.on("keypress", async (str, key) => {
        if ((key.ctrl && key.name === "c") || key.name === "escape") {
          if (process.stdin.isTTY) process.stdin.setRawMode(false);
          this.logger.info("Saliendo y cerrando navegador...");
          clearInterval(autoSaveInterval);
          resolve();
        } else if (key.name === "return" || key.name === "enter") {
          await saveSession();
        }
      });
    });

    await this.browserProvider.close();
    this.logger.info("Puedes cerrar esta terminal o continuar con el siguiente script.");
  }
}
