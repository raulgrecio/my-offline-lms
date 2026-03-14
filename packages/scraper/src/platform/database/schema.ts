import fs from 'fs';

import { DATA_DIR, DB_PATH } from '@config/paths';

import { IDatabase, SQLiteDatabase } from '@my-offline-lms/core';


export const db = new SQLiteDatabase(DB_PATH, { verbose: console.log });

/**
 * Initializes the database schema using the provided database instance.
 * By default, it uses the global `db` instance.
*/
export function initDb(database: IDatabase = db) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  database.initialize();
  console.log("Database schema initialized.");
}
