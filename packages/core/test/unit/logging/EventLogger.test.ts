import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventLogger } from "@core/logging/EventLogger";
import { LogBroker } from "@core/logging/LogBroker";

describe("EventLogger", () => {
  beforeEach(() => {
    LogBroker.clear();
    vi.clearAllMocks();
  });
  it("should emit info events to LogBroker", () => {
    const emitSpy = vi.spyOn(LogBroker, "emit");
    const logger = new EventLogger("test-context");

    logger.info("hello world");

    expect(emitSpy).toHaveBeenCalledWith("info", "hello world", undefined, "test-context");
  });

  it("should maintain context in contextual child loggers", () => {
    const emitSpy = vi.spyOn(LogBroker, "emit");
    const parent = new EventLogger("parent");
    const child = parent.withContext("child");

    child.info("message");

    expect(emitSpy).toHaveBeenCalledWith("info", "message", undefined, "child");
  });

  it("should emit error events with original error object", () => {
    const emitSpy = vi.spyOn(LogBroker, "emit");
    const logger = new EventLogger("ctx");
    const error = new Error("boom");

    logger.error("action failed", error);

    expect(emitSpy).toHaveBeenCalledWith("error", "action failed", error, "ctx");
  });

  it("should emit warn events", () => {
    const emitSpy = vi.spyOn(LogBroker, "emit");
    const logger = new EventLogger("ctx");
    logger.warn("watch out");
    expect(emitSpy).toHaveBeenCalledWith("warn", "watch out", undefined, "ctx");
  });

  it("should respect DEBUG environment variable", () => {
    const emitSpy = vi.spyOn(LogBroker, "emit");
    const logger = new EventLogger();

    // Disable debug
    process.env.DEBUG = "false";
    process.env.NODE_ENV = "production";
    logger.debug?.("hidden");
    expect(emitSpy).not.toHaveBeenCalled();

    // Enable debug
    process.env.DEBUG = "true";
    logger.debug?.("visible");
    expect(emitSpy).toHaveBeenCalledWith("debug", "visible", undefined, undefined);

    // Development environment case
    process.env.NODE_ENV = "development";
    process.env.DEBUG = "false";
    logger.debug?.("dev visible");
    expect(emitSpy).toHaveBeenCalledWith("debug", "dev visible", undefined, undefined);
  });

  it("should notify subscribers through LogBroker", () => {
    const subscriber = vi.fn();
    LogBroker.subscribe(subscriber);
    const logger = new EventLogger("pubsub");

    logger.info("msg");

    expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({
      type: "LOG_EMITTED",
      payload: expect.objectContaining({
        level: "info",
        message: "msg"
      }),
      metadata: expect.objectContaining({
        context: "pubsub"
      })
    }));
  });

  describe("Browser Environment Coverage", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("should use window.DEBUG if process is undefined (browser simulation)", () => {
      const emitSpy = vi.spyOn(LogBroker, "emit");
      const logger = new EventLogger("browser");
      vi.stubGlobal("process", undefined);
      vi.stubGlobal("window", { DEBUG: "true" });
      
      // @ts-ignore
      expect(logger.isDebugEnabled()).toBe(true);
      logger.debug("browser visible");
      expect(emitSpy).toHaveBeenCalledWith("debug", "browser visible", undefined, "browser");
    });

    it("should return false for isDebugEnabled if no flags are found", () => {
      const logger = new EventLogger();
      vi.stubGlobal("process", undefined);
      vi.stubGlobal("window", undefined);
      // @ts-ignore
      expect(logger.isDebugEnabled()).toBe(false);
    });
  });
});
