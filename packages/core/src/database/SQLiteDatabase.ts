import type { Database as DatabaseType, Options } from "better-sqlite3";
import Database from "better-sqlite3";

import type { IDatabase } from './IDatabase';
import { DATABASE_SCHEMA } from './schema';

export class SQLiteDatabase implements IDatabase {
  private db: DatabaseType;
  private readonly schema = DATABASE_SCHEMA;

  constructor(dbPath: string, options: Options = {}) {
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

  transaction(fn: (...args: any[]) => any): (...args: any[]) => any {
    return this.db.transaction(fn);
  }

  close(): void {
    this.db.close();
  }

  get nativeDb(): DatabaseType {
    return this.db;
  }
}
