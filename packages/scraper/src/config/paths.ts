import path from "path";

import { NodeFileSystem, PathResolver } from "@my-offline-lms/core";

// Inicializamos el resolver
const fs = new NodeFileSystem();
const resolver = new PathResolver({
  fs,
  env: process.env,
  startDir: __dirname
});

/** Root del monorepo */
export const MONOREPO_ROOT = resolver.getMonorepoRoot();

/** Root del package scraper */
export const SCRAPER_ROOT = resolver.getScraperRoot();

// Dirs privados del scraper (auth, intercepted)
export const DATA_DIR = fs.join(SCRAPER_ROOT, "data");
export const AUTH_DIR = fs.join(DATA_DIR, ".auth");
export const AUTH_STATE = fs.join(AUTH_DIR, "state.json");
export const INTERCEPTED_DIR = fs.join(DATA_DIR, "intercepted");

/** Configuración de rutas de assets compartida */
export const ASSET_PATHS_CONFIG = resolver.getAssetConfigPath();

// DB compartida
export const DB_PATH = resolver.getDbPath();
export const ASSETS_DIR = fs.join(resolver.getDataRoot(), "assets");
