import { describe, it, expect } from "vitest";
import { calculateStatus } from "@features/progress/application/calculateStatus";

describe("calculateStatus", () => {
  it("should return not_started when position is 0", () => {
    expect(calculateStatus(0, 100, false)).toBe('not_started');
  });

  it("should return in_progress when position is greater than 0 but not yet 90% and not completed", () => {
    expect(calculateStatus(50, 100, false)).toBe('in_progress');
  });

  it("should return completed if completed flag is true", () => {
    expect(calculateStatus(0, 100, true)).toBe('completed');
  });

  it("should return completed if progress is 90% or more (threshold check)", () => {
    expect(calculateStatus(90, 100, false)).toBe('completed');
    expect(calculateStatus(95, 100, false)).toBe('completed');
  });

  it("should return in_progress if progress is just below 90%", () => {
    expect(calculateStatus(89, 100, false)).toBe('in_progress');
  });

  it("should handle duration of 0 by returning in_progress if pos > 0 and only completed if flag is set", () => {
    // If duration 0, formula (pos / dur) would be Inf, handled by if dur > 0 check
    expect(calculateStatus(1, 0, false)).toBe('in_progress');
    expect(calculateStatus(1, 0, true)).toBe('completed');
  });
});
