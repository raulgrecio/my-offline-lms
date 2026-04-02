import { describe, it, expect, vi } from "vitest";
import { GET } from "@web/pages/api/assets/local-asset";
import fs from "node:fs";

// We mock ONLY the resolver to control the file path
vi.mock("@core/filesystem", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    AssetPathResolver: vi.fn().mockImplementation(function () {
      return {
        resolveExistingPath: vi.fn().mockResolvedValue("/tmp/repro-real.txt"),
      };
    }),
  };
});

vi.mock("@web/config/paths", () => ({
  getAssetConfigPath: vi.fn().mockResolvedValue("/tmp/config"),
  getMonorepoRoot: vi.fn().mockResolvedValue("/tmp/root"),
}));

describe("local-asset Reproduction with Real Stream", () => {
  it("should fail (crash) with ERR_INVALID_STATE in Node v24.14.0", async () => {
    const tempFile = "/tmp/repro-real.txt";
    fs.writeFileSync(tempFile, "some data");

    try {
      const url = new URL("http://localhost/api/assets/local-asset?path=repro-real.txt");
      const request = { headers: { get: () => null } } as any;

      const response = await GET({ url, request } as any);
      expect(response.status).toBe(200);

      const body = response.body!;
      // This should now PASS because we unified everything into createReadStream
      // which now returns a real Web ReadableStream via Readable.toWeb
      expect(body instanceof ReadableStream).toBe(true);

      const reader = body.getReader();
      console.log('Test (Fixed): Canceling body...');
      await reader.cancel();

      console.log('Test (Fixed): Waiting to ensure no crash...');
      await new Promise(resolve => setTimeout(resolve, 100));
    } finally {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  });
});
