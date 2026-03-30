import { IDatabase, SQLiteDatabase } from '@my-offline-lms/core/database';
import { IFileSystem, NodeFileSystem } from '@my-offline-lms/core/filesystem';

import { getDataDir, getDbPath } from '../../config/paths';
import { logger } from '@platform/logging';

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
