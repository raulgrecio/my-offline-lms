import { describe, expect, it, vi, beforeEach } from 'vitest';

import { SQLiteDatabase } from '@core/database';
import { NodeFileSystem } from '@core/filesystem';

import { initDb } from '@scraper/platform/database';
import { logger } from '@scraper/platform/logging';

vi.mock('@scraper/config/paths', () => ({
  getDataDir: vi.fn().mockResolvedValue('/tmp/mock-data'),
  getDbPath: vi.fn().mockResolvedValue(':memory:'),
}));

vi.mock('@scraper/platform/logging', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    withContext: vi.fn().mockReturnThis(),
  },
}));


vi.mock('@core/filesystem', async (importOriginal) => {
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

vi.mock('@core/database', async (importOriginal) => {
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
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('provided instance'));
    db.close();
  });

  it('should initialize using defaults if no options provided', async () => {
    const db = await initDb();
    expect(db).toBeInstanceOf(SQLiteDatabase);

    const tables = (db as SQLiteDatabase).prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    expect(tables.length).toBeGreaterThan(0);
    expect(logger.debug).toHaveBeenCalledWith('Mock SQL query');
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Database schema initialized.'));
    db.close();
  });
});
