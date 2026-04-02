import { vi } from 'vitest';

// Global protection to prevent accidental file-based database access during tests
vi.mock("@core/database", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    SQLiteDatabase: vi.fn().mockImplementation(function (dbPath, options) {
      const isTestPath = dbPath === ':memory:' || dbPath.includes('test-data') || dbPath.includes('mock');
      const finalPath = isTestPath ? dbPath : ':memory:';
      return new actual.SQLiteDatabase(finalPath, options);
    }),
  };
});
