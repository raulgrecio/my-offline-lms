import { type IDatabase, SQLiteDatabase } from '@core/database';
import { type IFileSystem, NodeFileSystem } from '@core/filesystem';

import { getDataDir, getDbPath } from '@scraper/config/paths';
import { logger } from '@scraper/platform/logging';

export interface InitDbOptions {
  database?: IDatabase;
  fsAdapter?: IFileSystem;
}

/**
 * Initializes the database schema and returns the database instance.
*/
export async function initDb(options: InitDbOptions = {}): Promise<IDatabase> {
  const { database, fsAdapter = new NodeFileSystem() } = options;

  if (database) {
    const dbInstance = database as SQLiteDatabase;
    dbInstance.initialize();
    logger.info("Database schema initialized with provided instance.");
    return dbInstance;
  }

  const dataDir = await getDataDir();
  const dbPath = await getDbPath();

  await fsAdapter.mkdir(dataDir, { recursive: true });

  const dbInstance = new SQLiteDatabase(dbPath, {
    verbose: (msg?: unknown) => {
      if (typeof msg === 'string') logger.debug(msg);
    }
  });

  dbInstance.initialize();
  logger.info("Database schema initialized.");

  return dbInstance;
}
