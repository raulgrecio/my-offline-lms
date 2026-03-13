import { describe, it, expect } from 'vitest';
import { initDb } from '@db/schema';
import { SQLiteDatabase } from '@platform/database/SQLiteDatabase';

describe('Database Schema', () => {
    it('should initialize database and tables', () => {
        const db = new SQLiteDatabase(':memory:');
        initDb(db);
        
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        expect(tables.length).toBeGreaterThan(0);
        db.close();
    });
});
