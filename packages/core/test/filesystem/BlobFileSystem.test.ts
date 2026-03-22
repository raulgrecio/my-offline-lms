import { describe, it, expect } from "vitest";
import { BlobFileSystem } from "@filesystem/BlobFileSystem";

describe("BlobFileSystem", () => {
  const blob = new BlobFileSystem("test-account", "test-container");

  it("should implement placeholder methods", async () => {
    expect(await blob.exists("blob://account/container/test.mp4")).toBe(true);
    expect(blob.isAbsolute("blob://")).toBe(true);
    expect(blob.sep).toBe("/");
    expect(blob.join("blob://account", "folder")).toBe("blob://account/folder");
    expect(blob.dirname("blob://account/container/file")).toBe("blob://account/container");
    
    expect((await blob.stat("blob://foo")).size).toBe(0);
    expect((await blob.stat("blob://foo")).isDirectory()).toBe(false);
    expect(await blob.readFile("blob://foo", "utf-8")).toBe("");
    expect(await blob.readFile("blob://foo")).toBeInstanceOf(Buffer);

    await expect(blob.writeFile("blob://foo", "data")).rejects.toThrow();
    await expect(blob.mkdir("blob://foo")).rejects.toThrow();
    await expect(blob.rm("blob://foo")).rejects.toThrow();
    await expect(blob.readdir("blob://foo")).rejects.toThrow();

    expect(blob.resolve("a", "b")).toBe("a/b");
    expect(blob.createReadStream("blob://foo")).toBeNull();
    expect(blob.createWriteStream("blob://foo")).toBeNull();
  });
});
