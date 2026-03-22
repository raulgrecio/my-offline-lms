import fs from 'fs';

import { IDatabase, SQLiteDatabase } from '@my-offline-lms/core';

import { DATA_DIR, DB_PATH } from '@config/paths';

export const db = new SQLiteDatabase(DB_PATH, { verbose: console.log });

/**
 * Initializes the database schema using the provided database instance.
 * By default, it uses the global `db` instance.
*/
export async function initDb(database: IDatabase = db) {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });

  database.initialize();
  console.log("Database schema initialized.");
}
