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

    it("should log errors and error objects", () => {
      const logger = new ConsoleLogger("test");
      const err = new Error("boom");
      logger.error("fail", err);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("ERROR [test]: fail"));
      expect(errorSpy).toHaveBeenCalledWith(err);
    });

    it("should log debug messages when DEBUG is true", () => {
      const logger = new ConsoleLogger();
      
      // Mock process.env
      const originalWindow = globalThis.window;
      const originalProcess = globalThis.process;
      delete (globalThis as any).window;
      (globalThis as any).process = { env: { DEBUG: "true" } };

      logger.debug?.("debug message");
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining("DEBUG: debug message"));

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
      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});
