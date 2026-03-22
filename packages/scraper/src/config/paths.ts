import { NodeFileSystem, PathResolver } from "@my-offline-lms/core";

// Inicializamos el resolver
const fs = new NodeFileSystem();
const resolver = new PathResolver({
  fs,
  env: process.env,
  startDir: __dirname
});

/** Root del monorepo */
export const getMonorepoRoot = async () => resolver.getMonorepoRoot();

/** Root del package scraper */
export const getScraperRoot = async () => resolver.getScraperRoot();

// Dirs privados del scraper (auth, intercepted)
export const getDataDir = async () => fs.join(await getScraperRoot(), "data");
export const getAuthDir = async () => fs.join(await getDataDir(), ".auth");
export const getAuthState = async () => fs.join(await getAuthDir(), "state.json");
export const getInterceptedDir = async () => fs.join(await getDataDir(), "intercepted");

/** Configuración de rutas de assets compartida */
export const getAssetPathsConfig = async () => resolver.getAssetConfigPath();

// DB compartida
export const getDbPath = async () => resolver.getDbPath();
export const getAssetsDir = async () => fs.join(resolver.getDataRoot(), "assets");
