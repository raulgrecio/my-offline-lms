import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { env } from "../config/env";

dotenv.config();
chromium.use(stealth());

const STATE_FILE = path.resolve(__dirname, "../../data/.auth/state.json");
const PLATFORM_URL = env.PLATFORM_BASE_URL;

/**
 * Verifica si la sesión almacenada sigue siendo válida intentando cargar
 * discretamente la página principal y viendo si redirige al login.
 */
export async function validateSession(): Promise<boolean> {
  console.log(`[AuthChecker] Validando sesión actual en segundo plano...`);

  if (!fs.existsSync(STATE_FILE)) {
    console.error(`[AuthChecker] ❌ No se encontró archivo state.json. Por favor, realiza el login.`);
    return false;
  }

  const browser = await chromium.launch({ headless: true });
  
  try {
    const context = await browser.newContext({ storageState: STATE_FILE });
    const page = await context.newPage();
    
    // Vamos a la raíz de la plataforma que debería requerir auth.
    const res = await page.goto(PLATFORM_URL, { waitUntil: "domcontentloaded", timeout: 20000 });
    
    if (!res) {
       console.error(`[AuthChecker] ❌ No se obtuvo respuesta del portal.`);
       return false;
    }

    const finalUrl = page.url();
    // Si la página final incluye "login", "signin", o "sso", asume que la cookie expiró
    if (finalUrl.toLowerCase().includes("login") || finalUrl.toLowerCase().includes("signin") || finalUrl.toLowerCase().includes("auth")) {
       console.error(`[AuthChecker] ❌ Sesión caducada. El servidor redirigió a: ${finalUrl}`);
       return false;
    }

    console.log(`[AuthChecker] ✅ Sesión válida (${finalUrl})`);
    return true;
  } catch (error: any) {
    console.error(`[AuthChecker] ❌ Error verificando sesión: ${error.message}`);
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Función helper para abortar scripts si la sesión es inválida
 */
export async function requireValidSession() {
  const isValid = await validateSession();
  if (!isValid) {
    console.error("\n========================================================");
    console.error("🚨 AUTENTICACIÓN REQUERIDA / SESIÓN CADUCADA 🚨");
    console.error("Ejecuta el siguiente comando para renovar tus credenciales:");
    console.error("  pnpm exec ts-node src/scraper/login.ts");
    console.error("========================================================\n");
    process.exit(1);
  }
}
