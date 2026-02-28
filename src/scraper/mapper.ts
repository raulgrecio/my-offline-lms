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

async function parsePlatform() {
  if (!fs.existsSync(authFile)) {
    console.error("❌ No se encontró estado de sesión. Ejecuta primero login.ts");
    process.exit(1);
  }

  const targetUrl = process.env.PLATFORM_BASE_URL;
  if (!targetUrl) {
    console.error("❌ Define PLATFORM_BASE_URL en tu fichero .env");
    process.exit(1);
  }

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
  await page.goto(targetUrl, { waitUntil: "networkidle" });

  console.log("✅ Página cargada. Esperando unos segundos para capturar peticiones XHR asíncronas...");
  
  // En este punto, como es la primera vez explorando esta plataforma (Oracle Univ),
  // vamos a dejar el navegador abierto 30 segundos para darle tiempo a hacer todas
  // las llamadas XHR iniciales (cursos, vídeos de la pagina, metadatos, etc)
  await page.waitForTimeout(30000);

  console.log("⏸️  Cerrando scraper. Por favor revisa la carpeta 'data/debug/' para ver los JSON interceptados.");
  await browser.close();
}

if (require.main === module) {
  parsePlatform().catch(console.error);
}
