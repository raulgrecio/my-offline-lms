import { describe, it, expect } from "vitest";
import { S3FileSystem } from "@filesystem/S3FileSystem";

describe("S3FileSystem", () => {
  const s3 = new S3FileSystem("test-bucket");

  it("should implement placeholder methods", () => {
    expect(s3.existsSync("s3://bucket/test.mp4")).toBe(true);
    expect(s3.isAbsolute("s3://bucket")).toBe(true);
    expect(s3.sep).toBe("/");
    expect(s3.join("s3://bucket", "folder")).toBe("s3://bucket/folder");
    expect(s3.dirname("s3://bucket/folder/file")).toBe("s3://bucket/folder");
    
    expect(s3.statSync("s3://foo").size).toBe(0);
    expect(s3.statSync("s3://foo").isDirectory()).toBe(false);
    expect(s3.readFileSync("s3://foo", "utf-8")).toBe("");
    expect(s3.readFileSync("s3://foo")).toBeInstanceOf(Buffer);

    expect(() => s3.writeFileSync("s3://foo", "data")).toThrow();
    expect(() => s3.mkdirSync("s3://foo")).toThrow();
    expect(() => s3.rmSync("s3://foo")).toThrow();
    expect(() => s3.readdirSync("s3://foo")).toThrow();

    expect(s3.resolve("a", "b")).toBe("a/b");
    expect(s3.createReadStream("s3://foo")).toBeNull();
    expect(s3.createWriteStream("s3://foo")).toBeNull();
  });
});
