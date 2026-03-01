import { chromium } from "playwright-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import path from "path";
import fs from "fs";

chromium.use(stealthPlugin());

const authDir = path.resolve(__dirname, "../../data/.auth");
const authFile = path.join(authDir, "state.json");

export async function interactiveLogin(
  targetUrl: string,
  waitSelector: string,
) {
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  console.log("Iniciando navegador para Auth...");
  const browser = await chromium.launch({ 
    headless: false,
    executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined,
    channel: process.env.CHROME_EXECUTABLE_PATH ? undefined : "chrome",
    args: [
      "--start-maximized",
      "--disable-blink-features=AutomationControlled"
    ]
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`Navegando a ${targetUrl}`);
  console.log(
    "Por favor, realiza el login (incluyendo 2FA) en la ventana del navegador.",
  );
  console.log(`Navegando a ${targetUrl}`);
  await page.goto(targetUrl);

  const readline = require("readline");
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  console.log("\n========================================================");
  console.log("👉 PRESIONA 'ENTER' PARA GUARDAR LA SESIÓN (puedes hacerlo varias veces)");
  console.log("👉 PRESIONA 'ESC' o 'Ctrl+C' PARA SALIR Y CERRAR EL NAVEGADOR");
  console.log("========================================================\n");

  await new Promise<void>((resolve) => {
    process.stdin.on("keypress", async (str, key) => {
      if ((key.ctrl && key.name === "c") || key.name === "escape") {
        if (process.stdin.isTTY) process.stdin.setRawMode(false);
        console.log("\n👋 Saliendo y cerrando navegador...");
        resolve();
      } else if (key.name === "return" || key.name === "enter") {
        console.log("\n[Auth] Guardando estado de la sesión y cookies...");
        try {
          await context.storageState({ path: authFile });

          const cookies = await context.cookies();
          const cookiesStr = cookies
            .map((c) => {
              // Netscape format: domain | include_subdomains | path | https_only | expires | name | value
              const includeSubdomains = c.domain.startsWith('.') ? "TRUE" : "FALSE";
              // yt-dlp/Python chokes on negative expirations. If invalid/session, we set to 0.
              const expires = (c.expires && c.expires > 0) ? Math.round(c.expires) : 0;
              return `${c.domain}\t${includeSubdomains}\t${c.path}\t${c.secure ? "TRUE" : "FALSE"}\t${expires}\t${c.name}\t${c.value}`;
            })
            .join("\n");

          fs.writeFileSync(
            path.join(authDir, "cookies.txt"),
            `# Netscape HTTP Cookie File\n# http://curl.haxx.se/rfc/cookie_spec.html\n# This is a generated file!  Do not edit.\n\n${cookiesStr}\n`,
          );

          console.log("✅ Sesión y cookies guardadas con éxito en data/.auth/");
        } catch (e) {
          console.error("❌ Error al guardar sesión:", e);
        }
      }
    });
  });

  await browser.close();
  console.log("Puedes cerrar esta terminal o continuar con el siguiente script.");
}

import dotenv from "dotenv";

dotenv.config();

// CLI test
if (require.main === module) {
  const url = process.env.PLATFORM_BASE_URL || "https://example.com/login";
  const selector = process.env.LOGIN_SUCCESS_SELECTOR || "body"; 
  console.log(`Usando URL base: ${url}`);
  interactiveLogin(url, selector).catch(console.error);
}
