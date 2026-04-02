import { describe, it, expect } from "vitest";
import { calculateRealProgress } from "@web/features/progress/application/calculateRealProgress";
import { calculateStatus } from "@web/features/progress/application/calculateStatus";

describe("Progress Calculations", () => {
  describe("calculateRealProgress", () => {
    it("should handle totalSegments <= 0", () => {
      const result = calculateRealProgress({
        type: "video",
        visitedSegments: 0,
        totalSegments: 0,
      });
      expect(result.progress).toBe(0);
      expect(result.status).toBe("not_started");
    });

    it("should handle validTotal === 0 after ignore", () => {
      const result = calculateRealProgress({
        type: "guide",
        visitedSegments: 0,
        totalSegments: 2,
        ignoreSegments: new Set([1, 2]),
      });
      expect(result.progress).toBe(1);
      expect(result.status).toBe("completed");
    });

    it("should calculate standard progress", () => {
      const result = calculateRealProgress({
        type: "video",
        visitedSegments: 5,
        totalSegments: 10,
      });
      expect(result.progress).toBe(0.5);
      expect(result.status).toBe("in_progress");
    });
  });

  describe("calculateStatus", () => {
    it("should handle zero total items", () => {
      const status = calculateStatus(0, 0, false);
      expect(status).toBe("not_started");
    });

    it("should handle completed items", () => {
      const status = calculateStatus(10, 10, true);
      expect(status).toBe("completed");
    });

    it("should handle 90% threshold for completion", () => {
      const status = calculateStatus(9, 10, false);
      expect(status).toBe("completed");
    });
  });
});
