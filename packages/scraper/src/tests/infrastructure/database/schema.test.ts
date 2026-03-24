import { describe, expect, it } from 'vitest';

import { initDb } from '@db/schema';
import { SQLiteDatabase } from '@my-offline-lms/core/database';
import { NodeFileSystem } from '@my-offline-lms/core/filesystem';

describe('Database Schema', () => {
  it('should initialize database and tables', async () => {
    const db = new SQLiteDatabase(':memory:');
    await initDb({ database: db, fsAdapter: new NodeFileSystem() });

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    expect(tables.length).toBeGreaterThan(0);
    db.close();
  });
});
