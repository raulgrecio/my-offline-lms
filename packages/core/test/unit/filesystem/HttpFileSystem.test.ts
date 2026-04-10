import { describe, it, expect } from "vitest";
import { HttpFileSystem } from "@core/filesystem/HttpFileSystem";

describe("HttpFileSystem", () => {
  const hfs = new HttpFileSystem();

  it("should support basic operations", async () => {
    expect(await hfs.exists("http://example.com")).toBe(true);
    expect(await hfs.readFile("http://example.com")).toBeInstanceOf(Buffer);
    expect(await hfs.readFile("http://example.com", "utf-8")).toBe("");
    
    const stats = await hfs.stat("http://example.com");
    expect(stats.size).toBe(0);
    expect(stats.isDirectory()).toBe(false);
  });

  it("should properly return null for streams", () => {
    expect(hfs.createReadStream("http://test")).toBeNull();
    expect(hfs.createWriteStream("http://test")).toBeNull();
  });

  it("should throw error for unsupported write operations", async () => {
    await expect(hfs.writeFile("p", "c")).rejects.toThrow("HttpFileSystem does not support writeFile");
    await expect(hfs.appendFile("p", "c")).rejects.toThrow("HttpFileSystem does not support appendFile");
    await expect(hfs.readdir("p")).rejects.toThrow("HttpFileSystem does not support readdir");
    await expect(hfs.mkdir("p")).rejects.toThrow("HttpFileSystem does not support mkdir");
    await expect(hfs.unlink("p")).rejects.toThrow("HttpFileSystem does not support unlink");
    await expect(hfs.rename("o", "n")).rejects.toThrow("HttpFileSystem does not support rename");
  });
});
