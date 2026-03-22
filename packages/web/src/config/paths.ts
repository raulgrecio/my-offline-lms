import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import { env } from "./env";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Encuentra el root del monorepo buscando marcadores comunes hacia arriba.
 * Esto asegura que funcione con pnpm, npm, yarn y en cualquier entorno (src o dist).
 */
function findMonorepoRoot(startDir: string): string {
  let currentDir = startDir;

  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, "pnpm-workspace.yaml"))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  // Fallback inteligente: si estamos en 'dist' necesitamos subir un nivel más
  if (__dirname.includes(path.sep + "dist" + path.sep)) {
    return path.resolve(__dirname, "../../../../../");
  }
  return path.resolve(__dirname, "../../../../");
}


// El root del monorepo (donde está pnpm-workspace.yaml)
export const MONOREPO_ROOT = findMonorepoRoot(__dirname);
export const WEB_ROOT = path.join(MONOREPO_ROOT, "packages", "web");

// Directorio de datos: usa DATA_DIR de .env si existe, si no usa 'data' en el root
export const DATA_ROOT = env.DATA_DIR
  ? (path.isAbsolute(env.DATA_DIR) ? env.DATA_DIR : path.join(MONOREPO_ROOT, env.DATA_DIR))
  : path.join(MONOREPO_ROOT, "data");

// DB compartida
export const DB_PATH = path.join(DATA_ROOT, "db.sqlite");

// Configuración de rutas de assets compartida
export const CONFIG_PATH = path.join(DATA_ROOT, "asset-paths.json");
