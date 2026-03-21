import { describe, it, expect, vi } from "vitest";

vi.mock("@platform/db/database", () => ({
  getDb: vi.fn().mockReturnValue({
    prepare: vi.fn().mockReturnValue({
      get: vi.fn(),
      all: vi.fn().mockReturnValue([]),
      run: vi.fn(),
    }),
  }),
}));

import { getActiveLearningPath, setActiveLearningPath } from "@features/settings/index";

describe("Settings Feature: Public API", () => {
  it("should provide access to active learning path", () => {
    const path = getActiveLearningPath();
    expect(path).toBeNull();
  });

  it("should set active learning path", () => {
    setActiveLearningPath({ id: "p1" });
    // Verify it doesn't throw
  });
});
