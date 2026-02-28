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

  const rl = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });

  await new Promise<void>((resolve) => {
    rl.question("\n👉 PRESIONA ENTER AQUÍ EN LA TERMINAL CUANDO HAYAS TERMINADO DE HACER LOGIN EN EL NAVEGADOR...\n", () => {
      rl.close();
      resolve();
    });
  });

  console.log(
    "Login exitoso detectado. Guardando estado de la sesión y cookies...",
  );

  await context.storageState({ path: authFile });

  const cookies = await context.cookies();
  const cookiesStr = cookies
    .map(
      (c) =>
        `${c.domain}\tTRUE\t${c.path}\t${c.secure ? "TRUE" : "FALSE"}\t${c.expires}\t${c.name}\t${c.value}`,
    )
    .join("\n");

  fs.writeFileSync(
    path.join(authDir, "cookies.txt"),
    `# Netscape HTTP Cookie File\n${cookiesStr}`,
  );

  console.log("Sesión y cookies guardadas con éxito en data/.auth/");
  await browser.close();
  console.log(
    "Puedes cerrar esta terminal o continuar con el siguiente script.",
  );
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
