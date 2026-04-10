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

import {
  getAllFavorites,
  getIsFavorite,
  toggleFavorite
} from "@web/features/favorites/index";

describe("Favorites Feature: Public API", () => {
  it("should provide access to all public methods", async () => {
    expect(await getAllFavorites()).toBeInstanceOf(Array);
    expect(await getIsFavorite({ id: "a1", type: "course" })).toBe(false);

    await toggleFavorite({ id: "a1", type: "course" });
  });
});
