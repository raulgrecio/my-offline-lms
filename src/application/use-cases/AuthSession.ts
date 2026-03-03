import fs from "fs";
import path from "path";
import readline from "readline";
import { BrowserProvider } from "../../infrastructure/browser/BrowserProvider";

export class AuthSession {
  private authDir: string;
  private authFile: string;

  constructor(private browserProvider: BrowserProvider) {
    this.authDir = path.resolve(__dirname, "../../../data/.auth");
    this.authFile = path.join(this.authDir, "state.json");
  }

  async interactiveLogin(targetUrl: string): Promise<void> {
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }

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
        await context.storageState({ path: this.authFile });

        const cookies = await context.cookies();
        const cookiesStr = cookies
          .map((c: any) => {
            const includeSubdomains = c.domain.startsWith('.') ? "TRUE" : "FALSE";
            const expires = (c.expires && c.expires > 0) ? Math.round(c.expires) : 0;
            return `${c.domain}\t${includeSubdomains}\t${c.path}\t${c.secure ? "TRUE" : "FALSE"}\t${expires}\t${c.name}\t${c.value}`;
          })
          .join("\n");

        fs.writeFileSync(
          path.join(this.authDir, "cookies.txt"),
          `# Netscape HTTP Cookie File\n# http://curl.haxx.se/rfc/cookie_spec.html\n# This is a generated file!  Do not edit.\n\n${cookiesStr}\n`,
        );

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
