import { SQLiteDatabase } from "@my-offline-lms/core";
import { runMigrations } from "./schema";
import { DB_PATH } from "../../config/paths";

// Singleton connection
let _db: SQLiteDatabase | null = null;

export function getDb(): SQLiteDatabase {
  if (!_db) {
    _db = new SQLiteDatabase(DB_PATH, { verbose: console.log });
    _db.exec("PRAGMA journal_mode=WAL;");
    runMigrations(_db);
  }
  return _db;
}
