import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "@web/pages/api/assets/metadata";
import * as CoursesFeature from "@web/features/courses";

vi.mock("@web/features/courses", () => ({
  updateAssetTotalPages: vi.fn(),
  getAssetById: vi.fn(),
}));

describe("Asset Metadata API Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should return a 400 error if assetId is missing", async () => {
      const url = new URL("http://localhost/api/assets/metadata");
      const response = await GET({ url } as any);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("assetId is required");
    });

    it("should return a 404 error if asset is not found", async () => {
      vi.mocked(CoursesFeature.getAssetById).mockResolvedValue(null);

      const url = new URL("http://localhost/api/assets/metadata?assetId=missing");
      const response = await GET({ url } as any);

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("Asset not found");
    });

    it("should return metadata for a valid asset", async () => {
      const mockAsset = {
        id: "test",
        metadata: { title: "Test", totalPages: 10 },
      };
      vi.mocked(CoursesFeature.getAssetById).mockResolvedValue(mockAsset as any);

      const url = new URL("http://localhost/api/assets/metadata?assetId=test");
      const response = await GET({ url } as any);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual(mockAsset.metadata);
    });
  });

  describe("POST", () => {
    it("should return a 400 error if parameters are missing", async () => {
      const request = {
        json: vi.fn().mockResolvedValue({ assetId: "test" }), // Missing totalPages
      } as any;
      const response = await POST({ request } as any);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("assetId and totalPages are required");
    });

    it("should update asset total pages successfully", async () => {
      const request = {
        json: vi.fn().mockResolvedValue({ assetId: "test", totalPages: 20 }),
      } as any;
      const response = await POST({ request } as any);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(CoursesFeature.updateAssetTotalPages).toHaveBeenCalledWith({
        id: "test",
        totalPages: 20,
      });
    });

    it("should return a 500 error on update failure", async () => {
      const request = {
        json: vi.fn().mockRejectedValue(new Error("Database error")),
      } as any;
      const response = await POST({ request } as any);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Internal server error");
    });
  });
});
