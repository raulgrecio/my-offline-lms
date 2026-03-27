import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { TextEncoder, TextDecoder } from 'util';
import "@testing-library/jest-dom/vitest";

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
