import { type ILogger, ConsoleLogger } from "@my-offline-lms/core/logging";
import { SQLiteDatabase } from "@my-offline-lms/core/database";
import { NodeFileSystem } from '@my-offline-lms/core/filesystem';
import { getDbPath } from "@config/paths";
import { runMigrations } from "./schema";

// Singleton connection
import { createLazyService } from "@my-offline-lms/core/di";

export const getDb = createLazyService(async (logger?: ILogger): Promise<SQLiteDatabase> => {
  const isTest = process.env.NODE_ENV === 'test';
  const effectiveLogger = logger ?? new ConsoleLogger("DB");

  const verbose = !isTest
    ? (sql: any) => effectiveLogger.debug?.(String(sql))
    : undefined

  const dbPath = await getDbPath();
  const fs = new NodeFileSystem();

  // Asegurar que el directorio de datos existe
  const dbDir = dbPath.substring(0, dbPath.lastIndexOf('/'));
  if (!(await fs.exists(dbDir))) {
    effectiveLogger.info(`Creating directory: ${dbDir}`);
    await fs.mkdir(dbDir, { recursive: true });
  }

  const db = new SQLiteDatabase(dbPath, { verbose });
  db.exec("PRAGMA journal_mode=WAL;");
  db.initialize(); // Create core schema (LearningPaths, etc.)
  runMigrations(db, effectiveLogger); // Create web schema (UserProgress, etc.)
  
  return db;
});
