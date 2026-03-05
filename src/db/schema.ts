import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = path.resolve(__dirname, "../../data/db.sqlite");
const dataDir = path.dirname(dbPath);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbPath, { verbose: console.log });

export function initDb(database = db) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS LearningPaths (
      id TEXT PRIMARY KEY,
      slug TEXT,
      title TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS Courses (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE,
      title TEXT
    );

    CREATE TABLE IF NOT EXISTS LearningPath_Courses (
      path_id TEXT,
      course_id TEXT,
      order_index INTEGER,
      PRIMARY KEY (path_id, course_id),
      FOREIGN KEY(path_id) REFERENCES LearningPaths(id),
      FOREIGN KEY(course_id) REFERENCES Courses(id)
    );

    CREATE TABLE IF NOT EXISTS Course_Assets (
      id TEXT PRIMARY KEY,
      course_id TEXT,
      type TEXT CHECK(type IN ('guide', 'video')),
      url TEXT,
      metadata JSON,
      status TEXT CHECK(status IN ('PENDING', 'DOWNLOADING', 'COMPLETED', 'FAILED')) DEFAULT 'PENDING',
      local_path TEXT,
      FOREIGN KEY(course_id) REFERENCES Courses(id)
    );
  `);
  console.log("Database schema initialized.");
}
