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

import {
  getAllFavorites,
  getIsFavorite,
  toggleFavorite
} from "@features/favorites/index";

describe("Favorites Feature: Public API", () => {
  it("should provide access to all public methods", () => {
    expect(getAllFavorites()).toBeInstanceOf(Array);
    expect(getIsFavorite({ id: "a1", type: "course" })).toBe(false);

    toggleFavorite({ id: "a1", type: "course" });
  });
});
