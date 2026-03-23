import fs from 'fs';
import { IDatabase, SQLiteDatabase } from '@my-offline-lms/core/database';

import { getDataDir, getDbPath } from '@config/paths';
import { logger } from '@platform/logging';

let _db: SQLiteDatabase | undefined;

/**
 * Proxy para la base de datos que permite exportar 'db' como constante 
 * pero inicializarla asíncronamente en initDb().
 */
export const db: IDatabase = new Proxy({} as IDatabase, {
  get(target, prop) {
    if (!_db) {
      throw new Error("Database not initialized. Please call await initDb() first.");
    }
    const val = (_db as any)[prop];
    if (typeof val === 'function') {
      return val.bind(_db);
    }
    return val;
  }
});


/**
 * Initializes the database schema.
*/
export async function initDb(database?: IDatabase) {
  if (database) {
    _db = database as SQLiteDatabase;
    _db.initialize();
    logger.info("Database schema initialized with provided instance.");
    return;
  }

  const dataDir = await getDataDir();
  const dbPath = await getDbPath();

  await fs.promises.mkdir(dataDir, { recursive: true });

  _db = new SQLiteDatabase(dbPath, {
    verbose: (msg?: unknown) => {
      if (typeof msg === 'string') logger.debug(msg);
    }
  });
  _db.initialize();
  logger.info("Database schema initialized.");
}
