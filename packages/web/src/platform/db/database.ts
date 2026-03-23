import fs from 'node:fs';
import path from 'node:path';

import { type ILogger, ConsoleLogger, NoopLogger } from "@my-offline-lms/core/logging";
import { SQLiteDatabase } from "@my-offline-lms/core/database";
import { DB_PATH } from "@config/paths";
import { runMigrations } from "./schema";

// Singleton connection
let _db: SQLiteDatabase | null = null;

export function getDb(logger?: ILogger): SQLiteDatabase {
  if (!_db) {
    const isTest = process.env.NODE_ENV === 'test';
    const effectiveLogger = logger ?? new ConsoleLogger("DB");

    const verbose = !isTest
      ? (sql: any) => effectiveLogger.debug?.(String(sql))
      : undefined

    // Asegurar que el directorio de datos existe
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      effectiveLogger.info(`Creating directory: ${dbDir}`);
      fs.mkdirSync(dbDir, { recursive: true });
    }

    _db = new SQLiteDatabase(DB_PATH, { verbose });
    _db.exec("PRAGMA journal_mode=WAL;");
    _db.initialize(); // Create core schema (LearningPaths, etc.)
    runMigrations(_db, effectiveLogger); // Create web schema (UserProgress, etc.)
  }
  return _db;
}
