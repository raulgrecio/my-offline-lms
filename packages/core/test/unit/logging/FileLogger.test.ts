import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileLogger } from "@core/logging/FileLogger";
import type { IFileSystem, IPath } from "@core/filesystem";

describe("FileLogger", () => {
  const mockFs: Partial<IFileSystem> = {
    exists: vi.fn().mockResolvedValue(true),
    mkdir: vi.fn().mockResolvedValue(undefined),
    appendFile: vi.fn().mockResolvedValue(undefined),
  };

  const mockPath: Partial<IPath> = {
    dirname: vi.fn().mockReturnValue("/logs"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should append logs to file", async () => {
    const logger = new FileLogger(
      "/logs/test.log",
      mockFs as IFileSystem,
      mockPath as IPath,
      "ctx"
    );

    logger.info("message");

    // Wait for the fire-and-forget append
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockFs.appendFile).toHaveBeenCalledWith(
      "/logs/test.log",
      expect.stringContaining("INFO [ctx]: message")
    );
  });

  it("should format error objects into the log line", async () => {
    const logger = new FileLogger(
      "/logs/test.log",
      mockFs as IFileSystem,
      mockPath as IPath
    );

    const error = new Error("boom");
    logger.error("Something went wrong", error);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockFs.appendFile).toHaveBeenCalledWith(
      "/logs/test.log",
      expect.stringContaining("ERROR: Something went wrong - Error: boom")
    );
  });

  it("should create directory if it does not exist", async () => {
    (mockFs.exists as any).mockResolvedValueOnce(false);
    const logger = new FileLogger(
      "/logs/test.log",
      mockFs as IFileSystem,
      mockPath as IPath
    );

    logger.info("msg");
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockFs.mkdir).toHaveBeenCalledWith("/logs", { recursive: true });
    expect(mockFs.appendFile).toHaveBeenCalled();
  });
});
