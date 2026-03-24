import { describe, it, expect } from "vitest";
import { NodePath } from "../../src/filesystem/NodePath";
import path from "path";

describe("NodePath", () => {
  const nodePath = new NodePath();

  it("should resolve paths like path.resolve", () => {
    expect(nodePath.resolve("a", "b")).toBe(path.resolve("a", "b"));
  });

  it("should join paths like path.join", () => {
    expect(nodePath.join("a", "b")).toBe(path.join("a", "b"));
  });

  it("should check if path is absolute", () => {
    expect(nodePath.isAbsolute("/abs")).toBe(true);
    expect(nodePath.isAbsolute("rel")).toBe(false);
  });

  it("should get dirname", () => {
    expect(nodePath.dirname("/a/b/c")).toBe(path.dirname("/a/b/c"));
  });

  it("should get extname", () => {
    expect(nodePath.extname("file.txt")).toBe(".txt");
  });

  it("should provide the separator", () => {
    expect(nodePath.sep).toBe(path.sep);
  });
});
