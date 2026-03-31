import { type ILogger } from "@core/logging";
import { SQLiteDatabase } from "@core/database";

export function runMigrations(db: SQLiteDatabase, logger: ILogger) {
  // --- Migraciones de esquema ---

  // 1. Renombrar position_sec -> position (versión antigua)
  try {
    db.exec("ALTER TABLE UserProgress RENAME COLUMN position_sec TO position;");
    logger.info("Renamed UserProgress.position_sec to position");
  } catch (e) { }

  // 2. Asegurar que max_position existe
  try {
    db.exec("ALTER TABLE UserProgress ADD COLUMN max_position REAL DEFAULT 0;");
    logger.info("Added UserProgress.max_position column");
  } catch (e) { }

  // [NUEVO] Migración estructural de UserProgress para incluir asset_type en PK
  try {
    const tableInfo = db.prepare("PRAGMA table_info(UserProgress)").all() as any[];
    const hasAssetType = tableInfo.some(c => c.name === 'asset_type');

    if (!hasAssetType) {
      logger.info("Migrating UserProgress to multi-type schema...");
      db.exec("PRAGMA foreign_keys=OFF;");
      db.exec("ALTER TABLE UserProgress RENAME TO UserProgress_old;");

      db.exec(`
        CREATE TABLE UserProgress (
          asset_id         TEXT,
          asset_type       TEXT DEFAULT 'video',
          position         REAL DEFAULT 0,
          max_position     REAL DEFAULT 0,
          visited_segments INTEGER DEFAULT 0,
          total_segments   INTEGER DEFAULT 0,
          completed        INTEGER DEFAULT 0,
          updated_at       TEXT DEFAULT (datetime('now')),
          PRIMARY KEY (asset_id, asset_type)
        );
      `);

      db.exec(`
        INSERT INTO UserProgress (asset_id, asset_type, position, max_position, visited_segments, completed, updated_at)
        SELECT asset_id, 'video', position, max_position, visited_segments, completed, updated_at 
        FROM UserProgress_old;
      `);

      db.exec("DROP TABLE UserProgress_old;");
      logger.info("Successfully migrated UserProgress schema");
    }

    // Migración de UserAssetSegments
    const segmentsInfo = db.prepare("PRAGMA table_info(UserAssetSegments)").all() as any[];
    const hasSegmentsType = segmentsInfo.some(c => c.name === 'asset_type');

    if (!hasSegmentsType) {
      logger.info("Migrating UserAssetSegments to multi-type schema...");
      db.exec("ALTER TABLE UserAssetSegments RENAME TO UserAssetSegments_old;");

      db.exec(`
        CREATE TABLE UserAssetSegments (
          asset_id   TEXT,
          asset_type TEXT DEFAULT 'video',
          segment    INTEGER,
          PRIMARY KEY (asset_id, asset_type, segment)
        );
      `);

      db.exec(`
        INSERT INTO UserAssetSegments (asset_id, asset_type, segment)
        SELECT asset_id, 'video', segment 
        FROM UserAssetSegments_old;
      `);

      db.exec("DROP TABLE UserAssetSegments_old;");
      db.exec("PRAGMA foreign_keys=ON;");
      logger.info("Successfully migrated UserAssetSegments schema");
    }
  } catch (e: any) {
    logger.error("Progress migration failed:", e.message);
    db.exec("PRAGMA foreign_keys=ON;");
  }

  // 3. Añadir columnas de agregación a UserCourseProgress
  try {
    db.exec("ALTER TABLE UserCourseProgress ADD COLUMN total_assets INTEGER DEFAULT 0;");
    logger.info("Added aggregation columns to UserCourseProgress");
  } catch (e) { }

  // 8. Unificación de colecciones (Course + LearningPath -> Collection)
  try {
    const collTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='UserCollectionProgress'").get();
    if (collTableExists) {
      // Migrar desde Course
      db.exec(`
        INSERT OR IGNORE INTO UserCollectionProgress (id, type, status, completed_items, in_progress_items, total_items, updated_at)
        SELECT course_id, 'course', status, completed_assets, in_progress_assets, total_assets, updated_at 
        FROM UserCourseProgress;
      `);
      // Migrar desde LearningPath
      db.exec(`
        INSERT OR IGNORE INTO UserCollectionProgress (id, type, status, completed_items, in_progress_items, total_items, updated_at)
        SELECT path_id, 'learning-path', status, completed_courses, in_progress_courses, total_courses, updated_at 
        FROM UserLearningPathProgress;
      `);
      logger.info("Migrated collections progress to UserCollectionProgress");
    }
  } catch (e) { }
  try {
    db.exec("ALTER TABLE UserLearningPathProgress ADD COLUMN total_courses INTEGER DEFAULT 0;");
    logger.info("Added aggregation columns to UserLearningPathProgress");
  } catch (e) { }

  // 5. [Eliminado] Refactorización de progreso global (course_id eliminado)

  // 7. Migración de favoritos: learning_path -> learning-path y actualización de CHECK constraint
  try {
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='UserFavorites'").get();

    if (tableExists) {
      db.exec("PRAGMA foreign_keys=OFF;");
      db.exec("DROP TABLE IF EXISTS UserFavorites_new;");
      db.exec(`
        CREATE TABLE UserFavorites_new (
          id    TEXT,
          type  TEXT CHECK(type IN ('course', 'learning-path')),
          PRIMARY KEY (id, type)
        );
      `);
      db.exec(`
        INSERT OR IGNORE INTO UserFavorites_new (id, type) 
        SELECT id, CASE WHEN type = 'learning_path' THEN 'learning-path' ELSE type END FROM UserFavorites;
      `);
      db.exec("DROP TABLE IF EXISTS UserFavorites;");
      db.exec("ALTER TABLE UserFavorites_new RENAME TO UserFavorites;");
      db.exec("PRAGMA foreign_keys=ON;");
      logger.info("Migrated UserFavorites constraint: learning_path -> learning-path");
    }
  } catch (e: any) {
    logger.error("Migration 7 failed:", e.message);
  }

  // 6. Crear tablas base si no existen
  db.exec(`
    CREATE TABLE IF NOT EXISTS UserProgress (
      asset_id         TEXT,
      asset_type       TEXT,
      position         REAL DEFAULT 0,
      max_position     REAL DEFAULT 0,
      visited_segments INTEGER DEFAULT 0,
      total_segments   INTEGER DEFAULT 0,
      completed        INTEGER DEFAULT 0,
      updated_at       TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (asset_id, asset_type)
    );

    CREATE TABLE IF NOT EXISTS UserCollectionProgress (
      id                 TEXT,
      type               TEXT, -- 'course', 'learning-path'
      status             TEXT DEFAULT 'not_started',
      completed_items    INTEGER DEFAULT 0,
      in_progress_items  INTEGER DEFAULT 0,
      total_items        INTEGER DEFAULT 0,
      updated_at         TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (id, type)
    );

    CREATE TABLE IF NOT EXISTS UserSettings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS UserFavorites (
      id    TEXT,
      type  TEXT CHECK(type IN ('course', 'learning-path')),
      PRIMARY KEY (id, type)
    );
 
    CREATE TABLE IF NOT EXISTS UserAssetSegments (
      asset_id   TEXT,
      asset_type TEXT,
      segment    INTEGER,
      PRIMARY KEY (asset_id, asset_type, segment)
    );
  `);
}
