import { describe, it, expect } from "vitest";

import { HttpFileSystem } from "@core/filesystem";

describe("HttpFileSystem", () => {
  const hfs = new HttpFileSystem();

  it("should implement placeholder methods", async () => {
    expect(await hfs.exists("http://foo")).toBe(true);
    expect(await hfs.readFile("http://foo", "utf-8")).toBe("");
    expect(await hfs.readFile("http://foo")).toBeInstanceOf(Buffer);

    await expect(hfs.writeFile("http://foo", "data")).rejects.toThrow();
    await expect(hfs.mkdir("http://foo")).rejects.toThrow();
    await expect(hfs.readdir("http://foo")).rejects.toThrow();
    await expect(hfs.unlink("http://foo")).rejects.toThrow();
    await expect(hfs.rename("http://foo", "http://bar")).rejects.toThrow();

    const stats = await hfs.stat("http://foo");
    expect(stats.size).toBe(0);
    expect(stats.isDirectory()).toBe(false);
  });
});
