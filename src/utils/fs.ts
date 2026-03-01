import fs from "fs";

/**
 * Helper para crear directorios si no existen
 */
export function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
