import { PathResolver, NodeFileSystem, NodePath } from '@core/filesystem';

// Inicializamos el resolver
const fs = new NodeFileSystem();
const pathAdapter = new NodePath();

const resolver = new PathResolver({
  fs,
  path: pathAdapter,
  env: process.env,
  startDir: typeof __dirname !== 'undefined' ? __dirname : undefined
});

/** Root del monorepo */
export const getMonorepoRoot = async () => resolver.getMonorepoRoot();

/** Root del package scraper */
export const getScraperRoot = async () => resolver.getScraperRoot();

// Dirs privados del scraper (auth, intercepted)
export const getDataDir = async () => pathAdapter.join(await getScraperRoot(), "data");
export const getAuthDir = async () => pathAdapter.join(await getDataDir(), ".auth");
export const getAuthState = async () => pathAdapter.join(await getAuthDir(), "state.json");
export const getInterceptedDir = async () => pathAdapter.join(await getDataDir(), "intercepted");
export const getLogsDir = async () => pathAdapter.join(await getMonorepoRoot(), "logs");
export const getLogsFile = async () => {
  // Folder structure: logs/YYYY-MM-DD/
  // Filename format: scraper_HH-mm-ss.log (UTC)
  const now = new Date();
  const dateFolder = now.toISOString().split('T')[0];
  const timeStr = now.getUTCHours().toString().padStart(2, '0') + '-' +
    now.getUTCMinutes().toString().padStart(2, '0') + '-' +
    now.getUTCSeconds().toString().padStart(2, '0');

  return pathAdapter.join(await getLogsDir(), dateFolder, `scraper_${timeStr}.log`);
};

/** Configuración de rutas de assets compartida */
export const getAssetPathsConfig = async () => await resolver.getAssetConfigPath();

// DB compartida
export const getDbPath = async () => await resolver.getDbPath();
export const getAssetsDir = async () => pathAdapter.join(await resolver.getDataRoot(), "assets");
