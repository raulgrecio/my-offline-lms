import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@web/pages/api/favorites/toggle";
import * as FavoritesFeature from "@web/features/favorites";

vi.mock("@web/features/favorites", () => ({
  toggleFavorite: vi.fn(),
}));

vi.mock("@web/platform/logging", () => ({
  logger: { error: vi.fn() },
}));

describe("Favorites Toggle API Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a 400 error for invalid parameters", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({ id: "test", type: "invalid" }),
    } as any;
    const response = await POST({ request } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("invalid parameters");
  });

  it("should return ok: true for valid course toggle", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({ id: "test-course", type: "course" }),
    } as any;
    const response = await POST({ request } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(FavoritesFeature.toggleFavorite).toHaveBeenCalledWith({
      id: "test-course",
      type: "course",
    });
  });

  it("should return ok: true for valid learning-path toggle", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({ id: "lp-id", type: "learning-path" }),
    } as any;
    const response = await POST({ request } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(FavoritesFeature.toggleFavorite).toHaveBeenCalledWith({
      id: "lp-id",
      type: "learning-path",
    });
  });

  it("should return a 500 error on internal failure", async () => {
    const request = {
      json: vi.fn().mockRejectedValue(new Error("Oops")),
    } as any;
    const response = await POST({ request } as any);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
  });
});
