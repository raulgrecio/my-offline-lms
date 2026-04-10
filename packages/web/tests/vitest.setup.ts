import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for tests
// @ts-ignore
globalThis.TextEncoder = TextEncoder;
// @ts-ignore
globalThis.TextDecoder = TextDecoder;
// @ts-ignore
globalThis.Uint8Array = Uint8Array;

// Auto-cleanup after each test for React components
afterEach(() => {
  cleanup();
});

// Browser-specific mocks (only for JSDOM environment)
if (typeof window !== 'undefined') {
  // Mock ResizeObserver
  class ResizeObserverMock {
    observe() { }
    unobserve() { }
    disconnect() { }
  }

  globalThis.ResizeObserver = ResizeObserverMock;

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Global protection to prevent accidental file-based database access during tests
vi.mock("@core/database", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    SQLiteDatabase: vi.fn().mockImplementation(function (dbPath, options) {
      // If NOT explicitly provided a different path, default to :memory:
      // This is a safety net. Note: we allow ":memory:" but also allow 
      // explicit paths IF they are being intentionally tested (like in windows tests)
      // however, to avoid confusion, most tests should just get :memory:
      // The default dbPath usually includes 'data', so we must be careful not to allow it by mistake.
      const isTestPath = dbPath.includes('test-data') || dbPath.includes('mock');
      const finalPath = (dbPath === ':memory:' || isTestPath) ? dbPath : ':memory:';
      
      return new actual.SQLiteDatabase(finalPath, options);
    }),
  };
});
