import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { FileLogger } from "@core/logging/FileLogger";

vi.mock("fs");

describe("FileLogger", () => {
  const logPath = "/tmp/test.log";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  it("should create directory if it doesn't exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    new FileLogger(logPath);
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.dirname(logPath), { recursive: true });
  });

  it("should append formatted line to file", () => {
    const logger = new FileLogger(logPath, "test-ctx");
    logger.info("hello");

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      logPath,
      expect.stringMatching(/\[.*\] INFO \[test-ctx\]: hello\n/)
    );
  });

  it("should include error stack in error logs", () => {
    const logger = new FileLogger(logPath);
    const error = new Error("boom");
    logger.error("failed", error);

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      logPath,
      expect.stringContaining(`ERROR: failed - ${error.stack}`)
    );
  });

  it("should handle non-Error objects in error logs", () => {
    const logger = new FileLogger(logPath);
    logger.error("failed", { code: 500 });

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      logPath,
      expect.stringContaining(`ERROR: failed - {"code":500}`)
    );
  });

  it("should fallback to console.error if append fails", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(fs.appendFileSync).mockImplementation(() => {
      throw new Error("Disk full");
    });

    const logger = new FileLogger(logPath);
    logger.info("lost message");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to write to"),
      expect.any(Error)
    );
  });
});
