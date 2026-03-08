import path from "path";

// __dirname = packages/scraper/src/config (ts-node) or packages/scraper/dist/config (compiled)

/** Root del package scraper — para sus propios directorios de datos */
const SCRAPER_ROOT = path.resolve(__dirname, "../../");

// Dirs privados del scraper (auth, debug)
export const DATA_DIR = path.join(SCRAPER_ROOT, "data");
export const AUTH_DIR = path.join(DATA_DIR, ".auth");
export const AUTH_STATE = path.join(AUTH_DIR, "state.json");
export const DEBUG_DIR = path.join(DATA_DIR, "debug");

/** Root del monorepo — solo para recursos compartidos con otros packages (ej: la DB) */
export const MONOREPO_ROOT = path.resolve(__dirname, "../../../../");

/** Configuración de rutas de assets multi-ubicación */
export const ASSET_PATHS_CONFIG = path.join(MONOREPO_ROOT, "data", "asset-paths.json");

// DB compartida (database, assets descargados, leída también por el frontend web)
export const DB_PATH = path.join(MONOREPO_ROOT, "data", "db.sqlite");
export const ASSETS_DIR = path.join(MONOREPO_ROOT, "data", "assets");
