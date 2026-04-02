import { describe, it, expect } from "vitest";
import { calculateRealProgress } from "@web/features/progress/application/calculateRealProgress";

describe("calculateRealProgress", () => {
  it("should return not_started if totalSegments <= 0", () => {
    const result = calculateRealProgress({
      type: "video",
      visitedSegments: 5,
      totalSegments: 0
    });
    expect(result.status).toBe("not_started");
    expect(result.progress).toBe(0);
  });

  it("should return completed if validTotal === 0 (due to ignored segments)", () => {
    const result = calculateRealProgress({
      type: "video",
      visitedSegments: 0,
      totalSegments: 1,
      ignoreSegments: new Set([0])
    });
    expect(result.status).toBe("completed");
    expect(result.progress).toBe(1);
    expect(result.completed).toBe(true);
  });

  it("should clip validVisited to validTotal", () => {
    const result = calculateRealProgress({
      type: "video",
      visitedSegments: 10,
      totalSegments: 5
    });
    expect(result.progress).toBe(1);
    expect(result.remainingSegments).toBe(0);
  });

  it("should return in_progress if progress < threshold but visited > 0", () => {
    const result = calculateRealProgress({
      type: "video",
      visitedSegments: 1,
      totalSegments: 10
    });
    expect(result.status).toBe("in_progress");
    expect(result.completed).toBe(false);
  });

  it("should return completed if threshold is met", () => {
    const result = calculateRealProgress({
      type: "video",
      visitedSegments: 9,
      totalSegments: 10
    });
    expect(result.completed).toBe(true);
    expect(result.status).toBe("completed");
  });
});
