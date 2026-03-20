import { describe, it, expect } from "vitest";
import { calculateProgressPercentage } from "@features/progress/application/calculateProgressPercentage";

describe("calculateProgressPercentage", () => {
  it("should return 0 when total is 0", () => {
    expect(calculateProgressPercentage(0, 0, 0)).toBe(0);
  });

  it("should return 100% when all assets are completed", () => {
    expect(calculateProgressPercentage(10, 0, 10)).toBe(100);
  });

  it("should return the correct percentage when some are completed and others in progress", () => {
    // 5 completed (5.0) + 2 in progress (1.0) = 6.0 / 10 = 60%
    expect(calculateProgressPercentage(5, 2, 10)).toBe(60);
  });

  it("should handle rounding correctly", () => {
    // 1 completed (1.0) + 1 in progress (0.5) = 1.5 / 4 = 37.5% -> 38%
    expect(calculateProgressPercentage(1, 1, 4)).toBe(38);
  });

  it("should cap at 100%", () => {
    expect(calculateProgressPercentage(20, 0, 10)).toBe(100);
  });

  it("should clamp at 0% (edge case negative numbers)", () => {
    // Should not happen, but for robustness:
    expect(calculateProgressPercentage(-1, 0, 10)).toBe(0);
  });
});
