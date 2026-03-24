import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getDb } from '@platform/database/database';
import { SQLiteDatabase } from '@my-offline-lms/core/database';

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

describe('Database Singleton (getDb)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // No podemos resetear el singleton fácilmente si ya se cargó el módulo, 
    // pero para tests de CI suele ser aceptable si se comporta como singleton.
  });

  it('should return the same database instance on multiple calls', async () => {
    const db1 = await getDb();
    const db2 = await getDb();
    
    expect(db1).toBeDefined();
    expect(db1).toBe(db2);
    expect(db1).toBeInstanceOf(SQLiteDatabase);
    
    db1.close();
  });
});
