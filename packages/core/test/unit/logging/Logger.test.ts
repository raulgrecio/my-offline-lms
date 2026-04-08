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

    it("should log debug messages (internal filtering is removed; Router handles it)", () => {
      const logger = new ConsoleLogger();
      logger.debug("debug message");
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining("DEBUG: debug message"));
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
