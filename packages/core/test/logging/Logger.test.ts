import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConsoleLogger, NoopLogger } from "@logging";

describe("Logging Module", () => {
  describe("ConsoleLogger", () => {
    let logSpy: any;
    let warnSpy: any;
    let errorSpy: any;
    let debugSpy: any;

    beforeEach(() => {
      logSpy = vi.spyOn(console, "log").mockImplementation(() => { });
      warnSpy = vi.spyOn(console, "warn").mockImplementation(() => { });
      errorSpy = vi.spyOn(console, "error").mockImplementation(() => { });
      debugSpy = vi.spyOn(console, "debug").mockImplementation(() => { });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should log info messages", () => {
      const logger = new ConsoleLogger("test");
      logger.info("message");
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("INFO [test]: message"));
    });

    it("should log warn messages", () => {
      const logger = new ConsoleLogger();
      logger.warn("message", "ctx");
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("WARN [ctx]: message"));
    });

    it("should log error messages and stack trace", () => {
      const logger = new ConsoleLogger("test");
      const err = new Error("boom");
      logger.error("fail", err);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("ERROR [test]: fail"));
      expect(errorSpy).toHaveBeenCalledWith(err);

      errorSpy.mockClear();
      logger.error("fail solo");
      expect(errorSpy).toHaveBeenCalledOnce();
      expect(errorSpy).not.toHaveBeenCalledWith(undefined);
    });

    it("should log debug messages when DEBUG is true", () => {
      const logger = new ConsoleLogger("test");
      process.env.DEBUG = "true";
      logger.debug("debug message");
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining("DEBUG [test]: debug message"));

      debugSpy.mockClear();
      process.env.DEBUG = "false";
      logger.debug("hidden message");
      expect(debugSpy).not.toHaveBeenCalled();
    });

    it("should allow creating child loggers with context", () => {
      const parent = new ConsoleLogger("parent");
      const child = parent.withContext("child");
      child.info("hi");
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("INFO [child]: hi"));
    });

    it("should handle empty context", () => {
      const logger = new ConsoleLogger();
      logger.info("no ctx");
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("INFO: no ctx"));
      expect(logSpy).not.toContain("[");
    });

    it("should log debug messages in browser environment", () => {
      const logger = new ConsoleLogger("browser");

      const originalProcess = globalThis.process;
      // @ts-ignore
      globalThis.process = undefined;

      const originalWindow = globalThis.window;
      globalThis.window = { DEBUG: "true" } as any;

      logger.debug("browser debug");
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining("DEBUG [browser]: browser debug"));

      // Cleanup
      globalThis.window = originalWindow;
      globalThis.process = originalProcess;
    });
  });

  describe("NoopLogger", () => {
    it("should not log anything", () => {
      const logger = new NoopLogger();
      const logSpy = vi.spyOn(console, "log");
      logger.info("test");
      logger.warn("test");
      logger.error("test");
      logger.debug("test");
      expect(logSpy).not.toHaveBeenCalled();
      expect(logger.withContext("any")).toBe(logger);
    });
  });
});
