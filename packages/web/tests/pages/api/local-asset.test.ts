import { describe, it, expect, vi } from "vitest";
import fs from "fs";

import { GET } from "@pages/api/assets/local-asset";

vi.mock("fs", () => ({
  default: {
    statSync: vi.fn().mockReturnValue({ size: 100 }),
    createReadStream: vi.fn().mockReturnValue({}),
  },
  statSync: vi.fn().mockReturnValue({ size: 100 }),
  createReadStream: vi.fn().mockReturnValue({}),
}));

vi.mock("@my-offline-lms/core", () => {
  function AssetPathResolver() {
    return {
      resolveExistingPath: vi.fn().mockImplementation((p) => (p === "missing" ? null : "/test.pdf")),
    };
  }
  const NodeFileSystem = vi.fn();
  const getMimeType = vi.fn().mockReturnValue("application/pdf");
  return { AssetPathResolver, NodeFileSystem, getMimeType };
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
