import { SQLiteDatabase } from "@my-offline-lms/core";

export function runMigrations(db: SQLiteDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS UserProgress (
      asset_id     TEXT PRIMARY KEY,
      position_sec REAL DEFAULT 0,
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
