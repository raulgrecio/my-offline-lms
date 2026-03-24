import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../../../src/pages/api/assets/local-asset";
import { AssetPathResolver, UniversalFileSystem, NodePath } from "@my-offline-lms/core/filesystem";

const { mockFs, mockPath, mockResolver } = vi.hoisted(() => ({
  mockFs: {
    stat: vi.fn(),
    createReadStream: vi.fn(),
    registerRemote: vi.fn(),
  },
  mockPath: {
    extname: vi.fn(),
  },
  mockResolver: {
    resolveExistingPath: vi.fn(),
  }
}));

vi.mock("@my-offline-lms/core/filesystem", () => ({
  AssetPathResolver: vi.fn().mockImplementation(function() { return mockResolver; }),
  UniversalFileSystem: vi.fn().mockImplementation(function() { return mockFs; }),
  NodeFileSystem: vi.fn(),
  HttpFileSystem: vi.fn(),
  NodePath: vi.fn().mockImplementation(function() { return mockPath; }),
  getMimeType: vi.fn(() => "application/octet-stream"),
}));





vi.mock("@config/paths", () => ({
  getAssetConfigPath: vi.fn().mockResolvedValue("/tmp/config"),
  getMonorepoRoot: vi.fn().mockResolvedValue("/tmp/root"),
}));

vi.mock("@platform/logging", () => ({
  logger: { error: vi.fn() },
}));

describe("local-asset API Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a 400 error if path is missing", async () => {
    const url = new URL("http://localhost/api/assets/local-asset");
    const response = await GET({ url } as any);

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Missing path parameter");
  });

  it("should return a 404 error if file is not found", async () => {
    mockResolver.resolveExistingPath.mockResolvedValue(null);

    const url = new URL("http://localhost/api/assets/local-asset?path=missing.png");
    const response = await GET({ url } as any);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("File not found at any location");
  });

  it("should redirect for external URLs", async () => {
    const externalUrl = "https://external.com/asset.png";
    mockResolver.resolveExistingPath.mockResolvedValue(externalUrl);

    const url = new URL("http://localhost/api/assets/local-asset?path=external.png");
    const response = await GET({ url } as any);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(externalUrl);
  });

  it("should return a 200 response for existing local files", async () => {
    const localFile = "/path/to/local.pdf";
    mockResolver.resolveExistingPath.mockResolvedValue(localFile);
    mockFs.stat.mockResolvedValue({ size: 1000 } as any);
    mockFs.createReadStream.mockReturnValue("mock-stream" as any);
    mockPath.extname.mockReturnValue(".pdf");

    const url = new URL("http://localhost/api/assets/local-asset?path=local.pdf");
    const request = { headers: new Map() } as any;
    const response = await GET({ url, request } as any);

    expect(response.status).toBe(200);
    expect(mockFs.createReadStream).toHaveBeenCalledWith(localFile);
  });

  it("should return a 26 response for range requests", async () => {
    const localFile = "/path/to/local.mp4";
    mockResolver.resolveExistingPath.mockResolvedValue(localFile);
    mockFs.stat.mockResolvedValue({ size: 1000 } as any);
    mockFs.createReadStream.mockReturnValue("mock-range-stream" as any);
    mockPath.extname.mockReturnValue(".mp4");

    const url = new URL("http://localhost/api/assets/local-asset?path=local.mp4");
    const request = {
      headers: {
        get: vi.fn().mockReturnValue("bytes=0-499"),
      },
    } as any;
    const response = await GET({ url, request } as any);

    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe("bytes 0-499/1000");
    expect(mockFs.createReadStream).toHaveBeenCalledWith(localFile, { start: 0, end: 499 });
  });

  it("should handle range requests with missing end", async () => {
    const localFile = "/path/to/local.mp4";
    mockResolver.resolveExistingPath.mockResolvedValue(localFile);
    mockFs.stat.mockResolvedValue({ size: 1000 } as any);
    mockFs.createReadStream.mockReturnValue("mock-range-stream" as any);
    mockPath.extname.mockReturnValue(".mp4");

    const url = new URL("http://localhost/api/assets/local-asset?path=local.mp4");
    const request = {
      headers: {
        get: vi.fn().mockReturnValue("bytes=500-"),
      },
    } as any;
    const response = await GET({ url, request } as any);

    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe("bytes 500-999/1000");
    expect(mockFs.createReadStream).toHaveBeenCalledWith(localFile, { start: 500, end: 999 });
  });

  it("should return a 416 error if range is out of bounds", async () => {
    const localFile = "/path/to/local.mp4";
    mockResolver.resolveExistingPath.mockResolvedValue(localFile);
    mockFs.stat.mockResolvedValue({ size: 1000 } as any);
    mockPath.extname.mockReturnValue(".mp4");

    const url = new URL("http://localhost/api/assets/local-asset?path=local.mp4");
    const request = {
      headers: {
        get: vi.fn().mockReturnValue("bytes=1000-2000"),
      },
    } as any;
    const response = await GET({ url, request } as any);

    expect(response.status).toBe(416);
    expect(response.headers.get("Content-Range")).toBe("bytes */1000");
  });

  it("should return a 500 error on filesystem error", async () => {
    const localFile = "/path/to/local.pdf";
    mockResolver.resolveExistingPath.mockResolvedValue(localFile);
    mockFs.stat.mockRejectedValue(new Error("Disk failed"));
    mockPath.extname.mockReturnValue(".pdf");

    const url = new URL("http://localhost/api/assets/local-asset?path=local.pdf");
    const request = { headers: new Map() } as any;
    const response = await GET({ url, request } as any);

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Error reading file");
  });
});

