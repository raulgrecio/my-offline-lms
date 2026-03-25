import * as matchers from "@testing-library/jest-dom/matchers";
import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { TextEncoder, TextDecoder } from 'util';

// @ts-ignore
globalThis.TextEncoder = TextEncoder;
// @ts-ignore
globalThis.TextDecoder = TextDecoder;
// @ts-ignore
globalThis.Uint8Array = Uint8Array;

// @ts-ignore
expect.extend(matchers);

// Mock ResizeObserver
class ResizeObserverMock {
  observe() { }
  unobserve() { }
  disconnect() { }
}
if (typeof window !== 'undefined') {
  window.ResizeObserver = ResizeObserverMock as any;
}

if (typeof HTMLCanvasElement !== 'undefined') {
  // Mock Canvas getContext to silence JSDOM warnings
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    createImageData: vi.fn(),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 0 }),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  });
}

// Optional: clean up components after each test
afterEach(() => {
  if (typeof window !== 'undefined') {
    cleanup();
  }
});
