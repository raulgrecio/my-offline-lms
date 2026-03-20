import "@testing-library/jest-dom/vitest";
import * as matchers from "@testing-library/jest-dom/matchers";
import { expect, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Optional: clean up components after each test
afterEach(() => {
  cleanup();
});
