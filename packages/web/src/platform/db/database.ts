import { createLazyService } from "@core/di";
import { type ILogger, ConsoleLogger } from "@core/logging";
import { NodeFileSystem, NodePath } from '@core/filesystem';
import { SQLiteDatabase } from "@core/database";

import { getDbPath } from "@web/config";

import { runMigrations } from "./schema";

const dbFactory = async (options?: { logger?: ILogger, path?: string }): Promise<SQLiteDatabase> => {
  const effectiveLogger = options?.logger ?? new ConsoleLogger("DB");

  const verbose = (sql: any) => effectiveLogger.debug?.(String(sql));

  const dbPath = options?.path ?? (await getDbPath());
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
};

// Public entry point: A singleton database service
export const getDb = createLazyService(async (logger?: ILogger): Promise<SQLiteDatabase> => {
  return await dbFactory({ logger });
});
