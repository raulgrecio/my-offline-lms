import { describe, it, expect } from "vitest";
import { S3FileSystem } from "@core/filesystem/S3FileSystem";

describe("S3FileSystem", () => {
  const s3 = new S3FileSystem("test-bucket");

  it("should implement placeholder methods", async () => {
    expect(await s3.exists("s3://bucket/test.mp4")).toBe(true);
    
    expect((await s3.stat("s3://foo")).size).toBe(0);
    expect((await s3.stat("s3://foo")).isDirectory()).toBe(false);
    expect(await s3.readFile("s3://foo", "utf-8")).toBe("");
    expect(await s3.readFile("s3://foo")).toBeInstanceOf(Buffer);

    await expect(s3.writeFile("s3://foo", "data")).rejects.toThrow();
    await expect(s3.mkdir("s3://foo")).rejects.toThrow();
    await expect(s3.rm("s3://foo")).rejects.toThrow();
    await expect(s3.readdir("s3://foo")).rejects.toThrow();
    await expect(s3.unlink("s3://foo")).rejects.toThrow();
    await expect(s3.rename("s3://foo", "s3://bar")).rejects.toThrow();

    expect(s3.createReadStream("s3://foo")).toBeNull();
    expect(s3.createWriteStream("s3://foo")).toBeNull();
  });
});
