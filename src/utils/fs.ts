import fs from "fs";
import path from "path";
/**
 * Helper para crear directorios si no existen
 */
export function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
