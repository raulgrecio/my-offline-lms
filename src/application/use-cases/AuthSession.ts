import readline from "readline";
import { BrowserProvider } from "../../infrastructure/browser/BrowserProvider";
import { IAuthSessionStorage } from "../../domain/repositories/IAuthSessionStorage";

export class AuthSession {
  private browserProvider: BrowserProvider;
  private authStorage: IAuthSessionStorage;

  constructor(deps: {
    browserProvider: BrowserProvider,
    authStorage: IAuthSessionStorage
  }) {
    this.browserProvider = deps.browserProvider;
    this.authStorage = deps.authStorage;
  }

  async interactiveLogin(targetUrl: string): Promise<void> {
    this.authStorage.ensureAuthDir();

    console.log("[AuthSession] Iniciando navegador interactivo...");
    const context = await this.browserProvider.getHeadfulContext(false);
    const page = await context.newPage();

    console.log(`[AuthSession] Navegando a ${targetUrl}`);
    console.log("[AuthSession] Por favor, realiza el login (incluyendo 2FA) en la ventana del navegador.");

    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    console.log("\n========================================================");
    console.log("👉 PRESIONA 'ENTER' PARA GUARDAR LA SESIÓN (puedes hacerlo varias veces)");
    console.log("👉 PRESIONA 'ESC' o 'Ctrl+C' PARA SALIR Y CERRAR EL NAVEGADOR");
    console.log("========================================================\n");

    const saveSession = async () => {
      console.log("\n[AuthSession] Guardando estado de la sesión y cookies... (Automático / Manual)");
      try {
        await context.storageState({ path: this.authStorage.getAuthFile() });

        const cookies = await context.cookies();
        this.authStorage.saveCookies(cookies);

        console.log("✅ Sesión y cookies guardadas con éxito en data/.auth/");
      } catch (e) {
        console.error("❌ Error al guardar sesión:", e);
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
          console.log("\n👋 Saliendo y cerrando navegador...");
          clearInterval(autoSaveInterval);
          resolve();
        } else if (key.name === "return" || key.name === "enter") {
          await saveSession();
        }
      });
    });

    await this.browserProvider.close();
    console.log("Puedes cerrar esta terminal o continuar con el siguiente script.");
  }
}
