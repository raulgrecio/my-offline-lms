import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConsoleLogger } from "@core/logging/ConsoleLogger";
import { NoopLogger } from "@core/logging/NoopLogger";
import { LogBroker } from "@core/logging/LogBroker";

describe("Logging Module", () => {
  beforeEach(() => {
    LogBroker.clear();
  });

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
      vi.clearAllMocks();
    });

    it("should log info messages", () => {
      const logger = new ConsoleLogger("ctx");
      logger.info("message");
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("INFO [ctx]: message"));
    });

    it("should log warnings", () => {
      const logger = new ConsoleLogger("ctx");
      logger.warn("message");
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("WARN [ctx]: message"));
    });

    it("should create child loggers with withContext", () => {
      const logger = new ConsoleLogger("parent");
      const child = logger.withContext("child");
      child.info("hello");
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("INFO [child]: hello"));
    });

    it("should log errors and error objects", () => {
      const logger = new ConsoleLogger("test");
      const err = new Error("boom");
      logger.error("fail", err);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("ERROR [test]: fail"));
      expect(errorSpy).toHaveBeenCalledWith(err);

      // Branch coverage: error without error object
      logger.error("minor fail");
      expect(errorSpy).toHaveBeenCalledTimes(3);
    });

    it("should log debug messages when DEBUG is true", () => {
      const logger = new ConsoleLogger();

      // Mock process.env
      const originalWindow = globalThis.window;
      const originalProcess = globalThis.process;
      delete (globalThis as any).window;

      // Case 1: DEBUG=true
      (globalThis as any).process = { env: { DEBUG: "true" } };
      logger.debug?.("debug message");
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining("DEBUG: debug message"));

      // Case 2: NODE_ENV=development
      (globalThis as any).process = { env: { NODE_ENV: "development", DEBUG: "false" } };
      logger.debug?.("dev message");
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining("DEBUG: dev message"));

      // Browser simulation
      delete (globalThis as any).process;
      (globalThis as any).window = { DEBUG: "true" };
      logger.debug?.("browser debug");
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining("DEBUG: browser debug"));

      // Default hidden case
      delete (globalThis as any).window;
      logger.debug?.("hidden");
      expect(debugSpy).toHaveBeenCalledTimes(3);

      // Cleanup
      globalThis.window = originalWindow;
      globalThis.process = originalProcess;
    });


  });

  describe("NoopLogger", () => {
    it("should not log anything", () => {
      const logSpy = vi.spyOn(console, "log");
      const logger = new NoopLogger();
      logger.info("msg");
      logger.warn("warn");
      logger.error("err", new Error());
      logger.debug?.("debug");
      expect(logger.withContext("ctx")).toBe(logger);
      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});
