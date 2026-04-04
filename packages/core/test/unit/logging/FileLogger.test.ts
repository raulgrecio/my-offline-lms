import { describe, it, expect, vi, beforeEach } from "vitest";
import { FileLogger } from "@core/logging/FileLogger";
import type { IFileSystem, IPath } from "@core/filesystem";

describe("FileLogger", () => {
  const logPath = "/tmp/test.log";
  let mockFs: any;
  let mockPath: any;

  beforeEach(() => {
    mockFs = {
      exists: vi.fn().mockResolvedValue(true),
      mkdir: vi.fn().mockResolvedValue(undefined),
      appendFile: vi.fn().mockResolvedValue(undefined),
    };
    mockPath = {
      dirname: vi.fn().mockReturnValue("/tmp"),
    };
    vi.clearAllMocks();
  });

  it("should create directory if it doesn't exist", async () => {
    mockFs.exists.mockResolvedValue(false);
    const logger = new FileLogger(logPath, mockFs as IFileSystem, mockPath as IPath);
    
    // We need to trigger an append because FileLogger no longer does mkdir in constructor
    logger.info("trigger");
    
    // Since append is async (fire and forget), we need to wait a tick
    await vi.waitUntil(() => mockFs.mkdir.mock.calls.length > 0);
    
    expect(mockFs.mkdir).toHaveBeenCalledWith("/tmp", { recursive: true });
  });

  it("should append formatted line to file", async () => {
    const logger = new FileLogger(logPath, mockFs as IFileSystem, mockPath as IPath, "test-ctx");
    logger.info("hello");

    await vi.waitUntil(() => mockFs.appendFile.mock.calls.length > 0);

    expect(mockFs.appendFile).toHaveBeenCalledWith(
      logPath,
      expect.stringMatching(/\[.*\] INFO \[test-ctx\]: hello\n/)
    );
  });

  it("should include error stack in error logs", async () => {
    const logger = new FileLogger(logPath, mockFs as IFileSystem, mockPath as IPath);
    const error = new Error("boom");
    logger.error("failed", error);

    await vi.waitUntil(() => mockFs.appendFile.mock.calls.length > 0);

    expect(mockFs.appendFile).toHaveBeenCalledWith(
      logPath,
      expect.stringContaining(`ERROR: failed - ${error.stack}`)
    );
  });

  it("should handle non-Error objects in error logs", async () => {
    const logger = new FileLogger(logPath, mockFs as IFileSystem, mockPath as IPath);
    logger.error("failed", { code: 500 });

    await vi.waitUntil(() => mockFs.appendFile.mock.calls.length > 0);

    expect(mockFs.appendFile).toHaveBeenCalledWith(
      logPath,
      expect.stringContaining(`ERROR: failed - {"code":500}`)
    );
  });

  it("should fallback to console.error if append fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFs.appendFile.mockRejectedValue(new Error("Disk full"));

    const logger = new FileLogger(logPath, mockFs as IFileSystem, mockPath as IPath);
    logger.info("lost message");

    await vi.waitUntil(() => consoleSpy.mock.calls.length > 0);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to write to"),
      expect.any(Error)
    );
  });
});
