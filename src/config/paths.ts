import path from 'path';

/**
 * Centralized data directory paths.
 * __dirname here is src/config/ (or dist/config/ when compiled),
 * so ../../ always resolves to the project root regardless of
 * where this constant is imported from.
 */
const PROJECT_ROOT = path.resolve(__dirname, '../../');

export const DATA_DIR = path.join(PROJECT_ROOT, 'data');
export const AUTH_DIR = path.join(DATA_DIR, '.auth');
export const AUTH_STATE = path.join(AUTH_DIR, 'state.json');
export const ASSETS_DIR = path.join(DATA_DIR, 'assets');
export const DEBUG_DIR = path.join(DATA_DIR, 'debug');
export const DB_PATH = path.join(DATA_DIR, 'db.sqlite');
