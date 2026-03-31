import { describe, it, expect, vi } from "vitest";

vi.mock("@web/platform/db/database", () => ({
  getDb: vi.fn().mockResolvedValue({
    prepare: vi.fn().mockReturnValue({
      get: vi.fn(),
      all: vi.fn().mockReturnValue([]),
      run: vi.fn(),
    }),
  }),
}));

import { getActiveLearningPath, setActiveLearningPath } from "@web/features/settings/index";

describe("Settings Feature: Public API", () => {
  it("should provide access to active learning path", async () => {
    const path = await getActiveLearningPath();
    expect(path).toBeNull();
  });

  it("should set active learning path", async () => {
    await setActiveLearningPath({ id: "p1" });
    // Verify it doesn't throw
  });
});
