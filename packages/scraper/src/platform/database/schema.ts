import { DB_PATH, DATA_DIR } from '@config/paths';
import fs from 'fs';
import { SQLiteDatabase } from '@platform/database/SQLiteDatabase';
import { IDatabase } from '@platform/database/IDatabase';


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
