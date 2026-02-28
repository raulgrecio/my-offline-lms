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
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`Navegando a ${targetUrl}`);
  console.log(
    "Por favor, realiza el login (incluyendo 2FA) en la ventana del navegador.",
  );
  console.log(
    `El script está esperando que aparezca el elemento: ${waitSelector}`,
  );

  await page.goto(targetUrl);

  // Wait indefinitely for the success element
  await page.waitForSelector(waitSelector, { timeout: 0 });

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

// CLI test
if (require.main === module) {
  const url = process.argv[2] || "https://example.com/login";
  const selector = process.argv[3] || "body"; // Require a specific selector like '#dashboard' in production
  interactiveLogin(url, selector).catch(console.error);
}
