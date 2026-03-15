import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Root del monorepo — resolución robusta desde packages/web/src/config */
export const MONOREPO_ROOT = path.resolve(__dirname, "../../../../");

/** Root del package web */
export const WEB_ROOT = path.resolve(__dirname, "../../");

// DB compartida en la raíz del monorepo
export const DB_PATH = path.join(MONOREPO_ROOT, "data", "db.sqlite");

// Configuración de rutas de assets compartida en la raíz del monorepo
export const CONFIG_PATH = path.join(MONOREPO_ROOT, "data", "asset-paths.json");
