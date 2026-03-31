import { type ILogger, ConsoleLogger } from "@core/logging";
import { SQLiteDatabase } from "@core/database";
import { NodeFileSystem, NodePath } from '@core/filesystem';
import { getDbPath } from "@web/config/paths";
import { runMigrations } from "./schema";

// Singleton connection
import { createLazyService } from "@core/di";

export const getDb = createLazyService(async (logger?: ILogger): Promise<SQLiteDatabase> => {
  const isTest = process.env.NODE_ENV === 'test';
  const effectiveLogger = logger ?? new ConsoleLogger("DB");

  const verbose = !isTest
    ? (sql: any) => effectiveLogger.debug?.(String(sql))
    : undefined

  const dbPath = await getDbPath();
  const fs = new NodeFileSystem();

  // Asegurar que el directorio de datos existe
  const pathAdapter = new NodePath();
  const dbDir = pathAdapter.dirname(dbPath);
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
