import { SQLiteDatabase } from "@my-offline-lms/core";

export function runMigrations(db: SQLiteDatabase) {
  // --- Migraciones de esquema ---

  // 1. Renombrar position_sec -> position (versión antigua)
  try {
    db.exec("ALTER TABLE UserProgress RENAME COLUMN position_sec TO position;");
    console.log("[DB] Renamed UserProgress.position_sec to position");
  } catch (e) {}

  // 2. Asegurar que max_position existe
  try {
    db.exec("ALTER TABLE UserProgress ADD COLUMN max_position REAL DEFAULT 0;");
    console.log("[DB] Added UserProgress.max_position column");
  } catch (e) {}

  // 3. Crear tablas base si no existen
  db.exec(`
    CREATE TABLE IF NOT EXISTS UserProgress (
      asset_id     TEXT PRIMARY KEY,
      position     REAL DEFAULT 0,
      max_position REAL DEFAULT 0,
      completed    INTEGER DEFAULT 0,
      updated_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS UserCourseProgress (
      course_id  TEXT PRIMARY KEY,
      status     TEXT DEFAULT 'not_started',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS UserSettings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}
