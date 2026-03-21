import { describe, it, expect, vi } from "vitest";

import { POST as togglePOST } from "@pages/api/favorites/toggle";
import { POST as videoPOST } from "@pages/api/progress/video";
import { toggleFavorite } from "@features/favorites";
import { updateVideoProgress } from "@features/progress";

vi.mock("@features/favorites", () => ({
  toggleFavorite: vi.fn(),
}));

vi.mock("@features/progress", () => ({
  updateVideoProgress: vi.fn(),
}));

describe("API Routes", () => {
  describe("POST: favorites/toggle", () => {
    it("should return 400 for invalid parameters", async () => {
      const request = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ id: "c1", type: "invalid" }),
      });
      const response = await togglePOST({ request } as any);
      expect(response.status).toBe(400);
    });

    it("should call toggleFavorite and return 200 on success", async () => {
      const request = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ id: "c1", type: "course" }),
      });
      const response = await togglePOST({ request } as any);
      expect(response.status).toBe(200);
      expect(toggleFavorite).toHaveBeenCalledWith({ id: "c1", type: "course" });
    });
  });

  describe("POST: progress/video", () => {
    it("should return 400 for missing fields", async () => {
      const request = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ assetId: "a1" }), // missing courseId and position
      });
      const response = await videoPOST({ request } as any);
      expect(response.status).toBe(400);
    });

    it("should call updateVideoProgress and return 200 on success", async () => {
      const request = new Request("http://localhost", {
        method: "POST",
        body: JSON.stringify({ assetId: "a1", courseId: "c1", position: 100, duration: 300 }),
      });
      const response = await videoPOST({ request } as any);
      expect(response.status).toBe(200);
      expect(updateVideoProgress).toHaveBeenCalledWith({
        assetId: "a1",
        id: "c1",
        position: 100,
        duration: 300,
      });
    });
  });
});
