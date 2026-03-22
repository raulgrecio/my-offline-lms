import { describe, it, expect } from "vitest";
import { HttpFileSystem } from "@filesystem/HttpFileSystem";

describe("HttpFileSystem", () => {
  const hfs = new HttpFileSystem();

  it("should implement placeholder methods", async () => {
    expect(await hfs.exists("http://foo")).toBe(true);
    expect(await hfs.readFile("http://foo", "utf-8")).toBe("");
    expect(await hfs.readFile("http://foo")).toBeInstanceOf(Buffer);
    
    await expect(hfs.writeFile("http://foo", "data")).rejects.toThrow();
    await expect(hfs.mkdir("http://foo")).rejects.toThrow();
    await expect(hfs.readdir("http://foo")).rejects.toThrow();

    expect(hfs.resolve("http://foo", "bar")).toContain("http://foo/bar");
    expect(hfs.join("http://foo", "bar")).toContain("http://foo/bar");
    expect(hfs.isAbsolute("http://foo")).toBe(true);
    expect(hfs.isAbsolute("https://foo")).toBe(true);
    
    expect(hfs.dirname("http://foo/bar/baz")).toBe("http://foo/bar");
    
    const stats = await hfs.stat("http://foo");
    expect(stats.size).toBe(0);
    expect(stats.isDirectory()).toBe(false);
    
    expect(hfs.sep).toBe("/");
  });
});
