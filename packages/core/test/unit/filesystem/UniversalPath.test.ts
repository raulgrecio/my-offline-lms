import { describe, it, expect } from "vitest";

import { NodePath, UniversalPath, WebPath } from "@core/filesystem";

describe("UniversalPath", () => {
  const nodePath = new NodePath();
  const webPath = new WebPath();
  const universalPath = new UniversalPath(nodePath, new Map([
    ["http", webPath],
    ["s3", webPath]
  ]));


  it("should extract protocol correctly", () => {
    expect((universalPath as any).getProtocol("http://example.com")).toBe("http");
    expect((universalPath as any).getProtocol("https://example.com")).toBe("http");
    expect((universalPath as any).getProtocol("S3://bucket")).toBe("s3");
    expect((universalPath as any).getProtocol("/local/path")).toBe(null);
  });

  it("should fallback to localPath if protocol is unknown or not in remotes", () => {
    // Current NodePath behavior treats unknown protocol as relative path
    expect(universalPath.resolve("unknown://host/a", "b")).toContain("unknown:/host/a/b");
  });

  it("should handle empty path in resolve/join", () => {
    expect(universalPath.resolve()).toBe(nodePath.resolve());
    expect(universalPath.join()).toBe(nodePath.join());
  });

  it("should resolve paths", () => {
    expect(universalPath.resolve("/a", "b")).toBe("/a/b");
    expect(universalPath.resolve("http://host/a", "b")).toBe("http://host/a/b");
  });

  it("should join paths", () => {
    expect(universalPath.join("/a", "b")).toBe("/a/b");
    expect(universalPath.join("s3://bucket/a", "b")).toBe("s3://bucket/a/b");
  });

  it("should check if path is absolute", () => {
    expect(universalPath.isAbsolute("http://host")).toBe(true);
    expect(universalPath.isAbsolute("C:/path")).toBe(true);
    expect(universalPath.isAbsolute("\\\\server\\share")).toBe(true);
    expect(universalPath.isAbsolute("//server/share")).toBe(true);
    expect(universalPath.isAbsolute("/abs")).toBe(true);
    expect(universalPath.isAbsolute("rel")).toBe(false);
  });

  it("should get dirname", () => {
    expect(universalPath.dirname("/a/b/c")).toBe("/a/b");
    expect(universalPath.dirname("http://host/a/b")).toBe("http://host/a");
  });

  it("should get extname", () => {
    expect(universalPath.extname("file.txt")).toBe(".txt");
    expect(universalPath.extname("http://host/file.png")).toBe(".png");
  });

  it("should provide the separator from local path", () => {
    expect(universalPath.sep).toBe(nodePath.sep);
  });
});
