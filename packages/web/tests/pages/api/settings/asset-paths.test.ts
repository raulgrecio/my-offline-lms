import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST, DELETE } from "@pages/api/settings/asset-paths";

const mockResolver = {
  getAvailablePaths: vi.fn(),
  saveNewPath: vi.fn(),
  removePath: vi.fn(),
};

vi.mock("@my-offline-lms/core/filesystem", () => ({
  AssetPathResolver: vi.fn().mockImplementation(function () { return mockResolver; }),
  NodeFileSystem: vi.fn(),
  NodePath: vi.fn(),
}));

vi.mock("@config/paths", () => ({
  getAssetConfigPath: vi.fn().mockResolvedValue("/tmp/config"),
  getMonorepoRoot: vi.fn().mockResolvedValue("/tmp/root"),
}));

vi.mock("@platform/logging", () => ({
  logger: { error: vi.fn() },
}));

describe("Asset Paths API Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should return available paths successfully", async () => {
      const paths = [{ path: "/p1", label: "P1" }];
      mockResolver.getAvailablePaths.mockResolvedValue(paths);

      const response = await GET({} as any);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual(paths);
      expect(mockResolver.getAvailablePaths).toHaveBeenCalled();
    });

    it("should return a 500 error on failure", async () => {
      mockResolver.getAvailablePaths.mockRejectedValue(new Error("Disk error"));

      const response = await GET({} as any);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Failed to get asset paths");
    });
  });

  describe("POST", () => {
    it("should return a 400 error if path or label is missing", async () => {
      const request = {
        json: vi.fn().mockResolvedValue({ path: "/p1" }), // missing label
      } as any;
      const response = await POST({ request } as any);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("path and label are required");
    });

    it("should save a new path successfully", async () => {
      const request = {
        json: vi.fn().mockResolvedValue({ path: "/p1", label: "P1" }),
      } as any;
      const response = await POST({ request } as any);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(mockResolver.saveNewPath).toHaveBeenCalledWith("/p1", "P1");
    });

    it("should return a 500 error on failure", async () => {
      const request = {
        json: vi.fn().mockResolvedValue({ path: "/p1", label: "P1" }),
      } as any;
      mockResolver.saveNewPath.mockRejectedValue(new Error("Write error"));

      const response = await POST({ request } as any);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Failed to add asset path");
    });
  });

  describe("DELETE", () => {
    it("should return a 400 error if path is missing", async () => {
      const request = {
        json: vi.fn().mockResolvedValue({}), // missing path
      } as any;
      const response = await DELETE({ request } as any);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("path is required");
    });

    it("should remove a path successfully", async () => {
      const request = {
        json: vi.fn().mockResolvedValue({ path: "/p1" }),
      } as any;
      const response = await DELETE({ request } as any);

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.ok).toBe(true);
      expect(mockResolver.removePath).toHaveBeenCalledWith("/p1");
    });

    it("should return a 500 error on failure", async () => {
      const request = {
        json: vi.fn().mockResolvedValue({ path: "/p1" }),
      } as any;
      mockResolver.removePath.mockRejectedValue(new Error("Delete error"));

      const response = await DELETE({ request } as any);

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe("Failed to remove asset path");
    });
  });
});
