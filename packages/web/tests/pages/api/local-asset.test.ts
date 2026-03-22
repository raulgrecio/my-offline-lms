import { describe, it, expect, vi } from "vitest";
import fs from "fs";

import { GET } from "@pages/api/assets/local-asset";

vi.mock("fs", () => ({
  default: {
    statSync: vi.fn().mockReturnValue({ size: 100 }),
    createReadStream: vi.fn().mockReturnValue({}),
    existsSync: vi.fn().mockReturnValue(true),
  },
  statSync: vi.fn().mockReturnValue({ size: 100 }),
  createReadStream: vi.fn().mockReturnValue({}),
  existsSync: vi.fn().mockReturnValue(true),
}));

vi.mock("@my-offline-lms/core", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    AssetPathResolver: function () {
      return {
        resolveExistingPath: vi.fn().mockImplementation(async (p) => (p === "missing" ? null : "/test.pdf")),
        ensureInitialized: vi.fn(async () => {}),
      };
    },
    UniversalFileSystem: function () {
      return {
        registerRemote: vi.fn(),
        stat: vi.fn().mockResolvedValue({ size: 100 }),
        createReadStream: vi.fn().mockReturnValue({}),
      };
    },
  };
});

describe("local-asset API route", () => {
  it("return 400 if path is missing", async () => {
    const res = await GET({ url: new URL("http://localhost"), request: new Request("http://localhost") } as any);
    expect(res.status).toBe(400);
  });

  it("return 404 if path is not resolved", async () => {
    const res = await GET({ url: new URL("http://localhost?path=missing"), request: new Request("http://localhost") } as any);
    expect(res.status).toBe(404);
  });

  it("return 200 without range", async () => {
    const res = await GET({ url: new URL("http://localhost?path=test.pdf"), request: new Request("http://localhost") } as any);
    expect(res.status).toBe(200);
  });

  it("return 206 with range", async () => {
    const res = await GET({
      url: new URL("http://localhost?path=test.pdf"),
      request: new Request("http://localhost", { headers: { range: "bytes=0-10" } }),
    } as any);
    expect(res.status).toBe(206);
  });

  it("return 416 if range is out of bounds", async () => {
    const res = await GET({
      url: new URL("http://localhost?path=test.pdf"),
      request: new Request("http://localhost", { headers: { range: "bytes=200-300" } }),
    } as any);
    expect(res.status).toBe(416);
  });
});
