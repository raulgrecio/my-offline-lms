import { Page } from "playwright";
import fs from "fs";
import path from "path";

import { ConsoleLogger } from "@platform/logging/ConsoleLogger";
import { INTERCEPTED_DIR } from "@config/paths";

export function setupInterceptor(page: Page, options?: { execTimestamp: number, prefix: string }): string {
  const targetDir = options 
    ? path.join(INTERCEPTED_DIR, `${options.prefix}_${options.execTimestamp}`) 
    : INTERCEPTED_DIR;

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const logger = new ConsoleLogger().withContext('SetupInterceptor');

  page.on("response", async (response) => {
    const url = response.url();
    const headers = response.headers();
    
    // Filtramos solo respuestas JSON (API calls)
    if (headers["content-type"]?.includes("application/json")) {
      try {
        const json = await response.json();
        
        /*
        // TODO: REVISAR SI ES NECESARIO ESTE FILTRADO AGRESIVO O SE PUEDE QUITAR DEFINITIVAMENTE

        // Removed aggressive filtering to capture all JSONs and find where the original guide filename is
        const isCorePayload = (PLATFORM.INTERCEPTOR.FILTER_API as readonly (string | RegExp)[]).some(pattern => 
          typeof pattern === "string" ? url.includes(pattern) : pattern.test(url)
        );
        
        if (!isCorePayload) {
          return;
        }
        */

        // Creamos un nombre de archivo seguro basado en la URL
        const urlObj = new URL(url);
        const safeName = urlObj.pathname.replace(/[^a-z0-9]/gi, '_').replace(/^_+|_+$/g, '');
        const filename = `${Date.now()}_${safeName}.json`;
        
        fs.writeFileSync(
          path.join(targetDir, filename),
          JSON.stringify({ url, method: response.request().method(), status: response.status(), data: json }, null, 2)
        );
        
        logger.info(`JSON interceptado y guardado: ${filename}`);
      } catch (e) {
        // Ignorar si el body no se puede parsear
      }
    }
  });
  
  logger.info(`Activado. Guardando respuestas JSON en ${targetDir}`);
  return targetDir;
}
