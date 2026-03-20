import fs from 'node:fs';
import path from 'node:path';

import { SQLiteDatabase } from "@my-offline-lms/core";
import { DB_PATH } from "@config/paths";
import { runMigrations } from "./schema";

// Singleton connection
let _db: SQLiteDatabase | null = null;

export function getDb(): SQLiteDatabase {
  if (!_db) {
    // Asegurar que el directorio de datos existe
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      console.log(`[DB] Creating directory: ${dbDir}`);
      fs.mkdirSync(dbDir, { recursive: true });
    }

    _db = new SQLiteDatabase(DB_PATH, { verbose: console.log });
    _db.exec("PRAGMA journal_mode=WAL;");
    _db.initialize(); // Create core schema (LearningPaths, etc.)
    runMigrations(_db); // Create web schema (UserProgress, etc.)
  }
  return _db;
}
