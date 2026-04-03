import { vi } from 'vitest';
import path from 'path';

// Global protection to prevent accidental file-based database access during tests
// Mock @core/database BEFORE importing loadScraperEnv which might use it
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

import { loadScraperEnv } from '../src/config/env';

// Prevent tests from exiting if env is invalid (shared process)
vi.spyOn(process, 'exit').mockImplementation(() => { return undefined as never; });

// Set up mandatory environment variables for tests (as fallback)
process.env.PLATFORM_BASE_URL = 'https://platform.com/';
process.env.DATA_DIR = './test-data';

// Load the environment so the 'env' object is populated, 
// using .env.test explicitly for tests
loadScraperEnv({ path: path.join(__dirname, '../../.env.test') });
