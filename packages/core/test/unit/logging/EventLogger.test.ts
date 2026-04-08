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

  it("should always emit debug events to LogBroker (filtering is handled by the Router)", () => {
    const emitSpy = vi.spyOn(LogBroker, "emit");
    const logger = new EventLogger("test");

    logger.debug("debug message");
    expect(emitSpy).toHaveBeenCalledWith("debug", "debug message", undefined, "test");
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

});
