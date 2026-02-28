import { chromium } from "playwright-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import path from "path";
import fs from "fs";
import { setupInterceptor } from "./interceptor";
import dotenv from "dotenv";

dotenv.config();

// Añadir plugin stealth para no ser detectados como bot
chromium.use(stealthPlugin());

const authFile = path.resolve(__dirname, "../../data/.auth/state.json");

async function parsePlatform(coursePath?: string) {
  if (!fs.existsSync(authFile)) {
    console.error("❌ No se encontró estado de sesión. Ejecuta primero login.ts");
    process.exit(1);
  }

  const baseUrl = process.env.PLATFORM_BASE_URL;
  if (!baseUrl) {
    console.error("❌ Define PLATFORM_BASE_URL en tu fichero .env (ej. https://mylearn.oracle.com)");
    process.exit(1);
  }

  const targetUrl = coursePath 
    ? (baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl) + '/' + (coursePath.startsWith('/') ? coursePath.substring(1) : coursePath)
    : baseUrl;

  console.log("🚀 Iniciando scraper de mapeo...");
  const browser = await chromium.launch({ 
    headless: false,
    executablePath: process.env.CHROME_EXECUTABLE_PATH || undefined,
    channel: process.env.CHROME_EXECUTABLE_PATH ? undefined : "chrome",
    args: [
      "--start-maximized",
      "--disable-blink-features=AutomationControlled"
    ]
  }); // Headless en false temporalmente para ver qué ocurre
  
  // Cargamos el contexto con las cookies/storage del login
  const context = await browser.newContext({ storageState: authFile });
  const page = await context.newPage();

  // Activamos el interceptor para guardar todos los JSOn que devuelve la API
  setupInterceptor(page);

  console.log(`Navegando a ${targetUrl}`);
  // Cambiamos 'networkidle' por 'domcontentloaded' porque hay peticiones continuas (telemetría, etc)
  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

  console.log("✅ Página cargada. Haciendo click en el tab de Guides para desencadenar la carga...");
  
  try {
    // El usuario nos dijo que el selector es #guides-tab
    await page.waitForSelector("#guides-tab", { timeout: 15000 });
    await page.click("#guides-tab");
    console.log("👆 Click realizado en el tab de Guides. Esperando respuestas API...");
  } catch (e) {
    console.log("⚠️ No se pudo clickear el tab de Guides en los primeros 15s. Tal vez ya estaba seleccionado o no aplica a este curso.");
  }

  // Esperamos un poco para capturar peticiones XHR
  await page.waitForTimeout(10000);

  console.log("⏸️  Cerrando scraper. Por favor revisa la carpeta 'data/debug/' para ver los JSON interceptados.");
  await browser.close();
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const coursePath = args[0];
  if (!coursePath && !process.env.PLATFORM_BASE_URL?.includes('/course/')) {
    console.log("Uso de extracción: ts-node src/scraper/mapper.ts <coursePath>");
    console.log("Ej: pnpm exec ts-node src/scraper/mapper.ts ou/course/oracle-database-19c-sql-workshop/105208");
    process.exit(1);
  }
  parsePlatform(coursePath).catch(console.error);
}
