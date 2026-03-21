import { describe, it, expect } from "vitest";
import { HttpFileSystem } from "@filesystem/HttpFileSystem";

describe("HttpFileSystem", () => {
  const hfs = new HttpFileSystem();

  it("should implement placeholder methods", () => {
    expect(hfs.existsSync("http://foo")).toBe(true);
    expect(hfs.readFileSync("http://foo", "utf-8")).toBe("");
    expect(hfs.readFileSync("http://foo")).toBeInstanceOf(Buffer);
    
    expect(() => hfs.writeFileSync("http://foo", "data")).toThrow();
    expect(() => hfs.mkdirSync("http://foo")).toThrow();
    expect(() => hfs.readdirSync("http://foo")).toThrow();

    expect(hfs.resolve("http://foo", "bar")).toContain("http://foo/bar");
    expect(hfs.join("http://foo", "bar")).toContain("http://foo/bar");
    expect(hfs.isAbsolute("http://foo")).toBe(true);
    expect(hfs.isAbsolute("https://foo")).toBe(true);
    
    expect(hfs.dirname("http://foo/bar/baz")).toBe("http://foo/bar");
    
    const stats = hfs.statSync("http://foo");
    expect(stats.size).toBe(0);
    expect(stats.isDirectory()).toBe(false);
    
    expect(hfs.sep).toBe("/");
  });
});
