import { describe, it, expect, vi } from "vitest";
// @ts-ignore
import ProgressBar from "@components/ProgressBar.astro";

describe("ProgressBar Component", () => {
  it("should be defined", () => {
    expect(ProgressBar).toBeDefined();
  });

  it("should have a render function or be a component function", () => {
    // Astro components are functions that take (result, props, slots)
    expect(typeof ProgressBar).toBe("function");
  });
});
