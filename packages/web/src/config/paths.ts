import { fileURLToPath } from "url";
import { NodeFileSystem, NodePath, PathResolver } from '@core/filesystem';

const pathAdapter = new NodePath();
const __filename = fileURLToPath(import.meta.url);
const __dirname = pathAdapter.dirname(__filename);

// Inicializamos el sistema de archivos y el resolver
const fs = new NodeFileSystem();
const resolver = new PathResolver({
  fs,
  path: pathAdapter,
  env: process.env, // O webEnv, pero PathResolver espera un Record<string, string|undefined>
  startDir: __dirname
});

// El root del monorepo
export const getMonorepoRoot = async () => resolver.getMonorepoRoot();
export const getWebRoot = async () => resolver.getWebRoot();
export const getDataRoot = async () => resolver.getDataRoot();

// DB compartida
export const getDbPath = async () => resolver.getDbPath();

// Configuración de rutas de assets compartida
export const getAssetConfigPath = async () => resolver.getAssetConfigPath();

// Exportamos el resolver por si alguien necesita rutas personalizadas
export { resolver };
