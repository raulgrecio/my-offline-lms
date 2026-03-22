import { describe, it, expect } from "vitest";
import { BlobFileSystem } from "@filesystem/BlobFileSystem";

describe("BlobFileSystem", () => {
  const blob = new BlobFileSystem("test-account", "test-container");

  it("should implement placeholder methods", () => {
    expect(blob.existsSync("blob://account/container/test.mp4")).toBe(true);
    expect(blob.isAbsolute("blob://")).toBe(true);
    expect(blob.sep).toBe("/");
    expect(blob.join("blob://account", "folder")).toBe("blob://account/folder");
    expect(blob.dirname("blob://account/container/file")).toBe("blob://account/container");
    
    expect(blob.statSync("blob://foo").size).toBe(0);
    expect(blob.statSync("blob://foo").isDirectory()).toBe(false);
    expect(blob.readFileSync("blob://foo", "utf-8")).toBe("");
    expect(blob.readFileSync("blob://foo")).toBeInstanceOf(Buffer);

    expect(() => blob.writeFileSync("blob://foo", "data")).toThrow();
    expect(() => blob.mkdirSync("blob://foo")).toThrow();
    expect(() => blob.rmSync("blob://foo")).toThrow();
    expect(() => blob.readdirSync("blob://foo")).toThrow();

    expect(blob.resolve("a", "b")).toBe("a/b");
    expect(blob.createReadStream("blob://foo")).toBeNull();
    expect(blob.createWriteStream("blob://foo")).toBeNull();
  });
});
