import Database from "better-sqlite3";
import path from "path";

// In Astro SSR, process.cwd() = packages/web directory
// Go up 2 levels to reach monorepo root where data/db.sqlite lives
const MONOREPO_ROOT = path.resolve(process.cwd(), "..", "..");
const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(MONOREPO_ROOT, process.env.DATABASE_PATH)
  : path.resolve(MONOREPO_ROOT, "data", "db.sqlite");

// Singleton connection
let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    runMigrations(_db);
  }
  return _db;
}

// ─── Migrations ──────────────────────────────────────────────────────────────

function runMigrations(db: Database.Database) {
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

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Course {
  id: string;
  slug: string;
  title: string;
}

export interface LearningPath {
  id: string;
  slug: string;
  title: string;
  description: string;
}

export interface Asset {
  id: string;
  courseId: string;
  type: "video" | "guide";
  url: string;
  metadata: {
    name: string;
    order_index?: number | string;
    filename?: string;
    [key: string]: unknown;
  };
  status: "PENDING" | "DOWNLOADING" | "COMPLETED" | "FAILED";
  localPath?: string;
}

export interface VideoProgress {
  assetId: string;
  positionSec: number;
  completed: boolean;
  updatedAt: string;
}

export interface CourseProgress {
  courseId: string;
  status: "not_started" | "in_progress" | "completed";
  updatedAt: string;
}

// ─── Read: Courses ────────────────────────────────────────────────────────────

export function getAllCourses(): Course[] {
  return getDb()
    .prepare("SELECT id, slug, title FROM Courses ORDER BY title ASC")
    .all() as Course[];
}

export function getCourseById(id: string): Course | null {
  return (
    (getDb()
      .prepare("SELECT id, slug, title FROM Courses WHERE id = ?")
      .get(id) as Course) ?? null
  );
}

export function getCourseAssets(courseId: string): Asset[] {
  const rows = getDb()
    .prepare("SELECT * FROM Course_Assets WHERE course_id = ?")
    .all(courseId) as any[];
  return rows.map((row) => ({
    id: row.id,
    courseId: row.course_id,
    type: row.type,
    url: row.url,
    metadata: row.metadata ? JSON.parse(row.metadata) : {},
    status: row.status,
    localPath: row.local_path,
  }));
}

// ─── Read: Learning Paths ────────────────────────────────────────────────────

export function getAllLearningPaths(): LearningPath[] {
  return getDb()
    .prepare(
      "SELECT id, slug, title, description FROM LearningPaths ORDER BY title ASC",
    )
    .all() as LearningPath[];
}

export function getLearningPathById(id: string): LearningPath | null {
  return (
    (getDb()
      .prepare(
        "SELECT id, slug, title, description FROM LearningPaths WHERE id = ?",
      )
      .get(id) as LearningPath) ?? null
  );
}

export function getCoursesForPath(
  pathId: string,
): (Course & { orderIndex: number })[] {
  return getDb()
    .prepare(
      `
      SELECT c.id, c.slug, c.title, lc.order_index as orderIndex
      FROM LearningPath_Courses lc
      JOIN Courses c ON c.id = lc.course_id
      WHERE lc.path_id = ?
      ORDER BY lc.order_index ASC
    `,
    )
    .all(pathId) as any[];
}

// ─── Read: Progress ──────────────────────────────────────────────────────────

export function getVideoProgress(assetId: string): VideoProgress | null {
  const row = getDb()
    .prepare(
      "SELECT asset_id, position_sec, completed, updated_at FROM UserProgress WHERE asset_id = ?",
    )
    .get(assetId) as any;
  if (!row) return null;
  return {
    assetId: row.asset_id,
    positionSec: row.position_sec,
    completed: row.completed === 1,
    updatedAt: row.updated_at,
  };
}

export function getCourseProgress(courseId: string): CourseProgress | null {
  const row = getDb()
    .prepare(
      "SELECT course_id, status, updated_at FROM UserCourseProgress WHERE course_id = ?",
    )
    .get(courseId) as any;
  if (!row) return null;
  return {
    courseId: row.course_id,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

export function getAllCourseProgress(): CourseProgress[] {
  return (
    getDb()
      .prepare("SELECT course_id, status, updated_at FROM UserCourseProgress")
      .all() as any[]
  ).map((row) => ({
    courseId: row.course_id,
    status: row.status,
    updatedAt: row.updated_at,
  }));
}

export function getLastWatchedAsset():
  | (Asset & { positionSec: number })
  | null {
  const row = getDb()
    .prepare(
      `
    SELECT ca.*, up.position_sec
    FROM UserProgress up
    JOIN Course_Assets ca ON ca.id = up.asset_id
    WHERE up.completed = 0 AND ca.type = 'video' AND ca.status = 'COMPLETED'
    ORDER BY up.updated_at DESC
    LIMIT 1
  `,
    )
    .get() as any;
  if (!row) return null;
  return {
    id: row.id,
    courseId: row.course_id,
    type: row.type,
    url: row.url,
    metadata: row.metadata ? JSON.parse(row.metadata) : {},
    status: row.status,
    localPath: row.local_path,
    positionSec: row.position_sec,
  };
}

export function getActiveLearningPath(): string | null {
  const row = getDb()
    .prepare("SELECT value FROM UserSettings WHERE key = 'active_path_id'")
    .get() as any;
  return row?.value ?? null;
}

// ─── Write: Progress ─────────────────────────────────────────────────────────

export function updateVideoProgress(
  assetId: string,
  positionSec: number,
  completed = false,
): void {
  getDb()
    .prepare(
      `
    INSERT INTO UserProgress (asset_id, position_sec, completed, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(asset_id) DO UPDATE SET
      position_sec = excluded.position_sec,
      completed    = excluded.completed,
      updated_at   = excluded.updated_at
  `,
    )
    .run(assetId, positionSec, completed ? 1 : 0);
}

export function markCourseStatus(
  courseId: string,
  status: CourseProgress["status"],
): void {
  getDb()
    .prepare(
      `
    INSERT INTO UserCourseProgress (course_id, status, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(course_id) DO UPDATE SET
      status     = excluded.status,
      updated_at = excluded.updated_at
  `,
    )
    .run(courseId, status);
}

export function setActiveLearningPath(pathId: string): void {
  getDb()
    .prepare(
      `
    INSERT INTO UserSettings (key, value) VALUES ('active_path_id', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `,
    )
    .run(pathId);
}
