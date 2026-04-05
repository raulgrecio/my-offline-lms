import { describe, it, expect, vi, beforeEach } from "vitest";
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
  });

  it("should notify subscribers through LogBroker", () => {
    const subscriber = vi.fn();
    LogBroker.subscribe(subscriber);
    const logger = new EventLogger("pubsub");
    
    logger.info("msg");
    
    expect(subscriber).toHaveBeenCalledWith(expect.objectContaining({
      level: "info",
      message: "msg",
      context: "pubsub"
    }));
  });
});
