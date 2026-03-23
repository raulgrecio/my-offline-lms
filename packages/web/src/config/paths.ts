import { fileURLToPath } from "url";
import path from "path";
import { NodeFileSystem, PathResolver } from "@my-offline-lms/core";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializamos el sistema de archivos y el resolver
const fs = new NodeFileSystem();
const resolver = new PathResolver({
  fs,
  env: process.env, // O webEnv, pero PathResolver espera un Record<string, string|undefined>
  startDir: __dirname
});

// El root del monorepo
export const MONOREPO_ROOT = resolver.getMonorepoRoot();
export const WEB_ROOT = resolver.getWebRoot();
export const DATA_ROOT = resolver.getDataRoot();

// DB compartida
export const DB_PATH = resolver.getDbPath();

// Configuración de rutas de assets compartida
export const CONFIG_PATH = resolver.getAssetConfigPath();

// Exportamos el resolver por si alguien necesita rutas personalizadas
export { resolver };
