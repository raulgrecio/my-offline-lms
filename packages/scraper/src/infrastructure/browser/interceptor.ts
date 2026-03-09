import { Page } from "playwright";
import fs from "fs";
import path from "path";

import { DEBUG_DIR } from "@config/paths";

const debugDir = DEBUG_DIR;

export function setupInterceptor(page: Page) {
  if (!fs.existsSync(debugDir)) {
    fs.mkdirSync(debugDir, { recursive: true });
  }

  page.on("response", async (response) => {
    const url = response.url();
    const headers = response.headers();
    
    // Filtramos solo respuestas JSON (API calls)
    if (headers["content-type"]?.includes("application/json")) {
      try {
        const json = await response.json();
        
        // Removed aggressive filtering to capture all JSONs and find where the original guide filename is


        // Creamos un nombre de archivo seguro basado en la URL
        const urlObj = new URL(url);
        const safeName = urlObj.pathname.replace(/[^a-z0-9]/gi, '_').replace(/^_+|_+$/g, '');
        const filename = `${Date.now()}_${safeName}.json`;
        
        fs.writeFileSync(
          path.join(debugDir, filename),
          JSON.stringify({ url, method: response.request().method(), status: response.status(), data: json }, null, 2)
        );
        
        console.log(`[Interceptor] JSON interceptado y guardado: ${filename}`);
      } catch (e) {
        // Ignorar si el body no se puede parsear
      }
    }
  });
  
  console.log(`[Interceptor] Activado. Guardando respuestas JSON en data/debug/`);
}
