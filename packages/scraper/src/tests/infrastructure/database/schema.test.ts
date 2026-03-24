import { describe, expect, it } from 'vitest';

import { initDb } from '@db/schema';
import { SQLiteDatabase } from '@my-offline-lms/core/database';
import { NodeFileSystem } from '@my-offline-lms/core/filesystem';
import { vi, beforeEach } from 'vitest';

vi.mock('@config/paths', () => ({
  getDataDir: vi.fn().mockResolvedValue('/tmp/mock-data'),
  getDbPath: vi.fn().mockResolvedValue(':memory:'),
}));

vi.mock('@my-offline-lms/core/filesystem', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    NodeFileSystem: vi.fn().mockImplementation(function () {
      return {
        mkdir: vi.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

vi.mock('@my-offline-lms/core/database', async (importOriginal) => {
  const actual = await importOriginal<any>();
  class MockSQLiteDatabase extends actual.SQLiteDatabase {
    constructor(path: string, options?: any) {
      if (options?.verbose) {
        options.verbose('Mock SQL query');
        options.verbose(null);
      }
      super(path, options);
    }
  }
  return {
    ...actual,
    SQLiteDatabase: MockSQLiteDatabase,
  };
});

describe('Database Schema', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize database and tables with provided instance', async () => {
    const db = new SQLiteDatabase(':memory:');
    await initDb({ database: db, fsAdapter: new NodeFileSystem() });

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    expect(tables.length).toBeGreaterThan(0);
    db.close();
  });

  it('should initialize using defaults if no options provided', async () => {
    const db = await initDb();
    expect(db).toBeInstanceOf(SQLiteDatabase);

    const tables = (db as SQLiteDatabase).prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    expect(tables.length).toBeGreaterThan(0);
    db.close();
  });
});
