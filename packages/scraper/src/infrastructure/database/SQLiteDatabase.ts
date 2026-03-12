import Database from "better-sqlite3";
import { IDatabase } from "./IDatabase";

export class SQLiteDatabase implements IDatabase {
  private db: Database.Database;

  private readonly schema = `
    CREATE TABLE IF NOT EXISTS LearningPaths (
      id TEXT PRIMARY KEY,
      slug TEXT,
      title TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS Courses (
      id TEXT PRIMARY KEY,
      slug TEXT,
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
  `;

  constructor(dbPath: string, options: Database.Options = {}) {
    this.db = new Database(dbPath, options);
  }

  prepare(sql: string): any {
    return this.db.prepare(sql);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  initialize(): void {
    this.db.exec(this.schema);
  }

  close(): void {
    this.db.close();
  }

  get nativeDb(): Database.Database {
    return this.db;
  }
}
