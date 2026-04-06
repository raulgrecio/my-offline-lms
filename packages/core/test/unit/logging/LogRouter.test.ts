import { describe, it, expect, vi, beforeEach } from "vitest";
import { LogRouter } from "@core/logging/LogRouter";
import { LogEventBus } from "@core/logging/LogEventBus";
import type { ILogger } from "@core/logging/ILogger";
import type { LogEvent } from "@core/logging/LogEvent";

describe("LogRouter", () => {
  let bus: LogEventBus;
  let router: LogRouter;
  let mockLogger: ILogger;

  beforeEach(() => {
    bus = new LogEventBus();
    router = new LogRouter(bus);
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      withContext: vi.fn().mockReturnThis(),
    };
  });

  const createEvent = (level: any, message: string, context?: string): LogEvent => ({
    type: "LOG_EMITTED",
    payload: { level, message },
    metadata: {
      id: "1",
      timestamp: new Date().toISOString(),
      context
    }
  });

  it("should route all levels when no options provided", () => {
    router.addTransport(mockLogger);

    bus.emit(createEvent("info", "msg info"));
    bus.emit(createEvent("warn", "msg warn"));
    bus.emit(createEvent("error", "msg error"));
    bus.emit(createEvent("debug", "msg debug"));

    expect(mockLogger.info).toHaveBeenCalledWith("msg info");
    expect(mockLogger.warn).toHaveBeenCalledWith("msg warn");
    expect(mockLogger.error).toHaveBeenCalledWith("msg error", undefined);
    expect(mockLogger.debug).toHaveBeenCalledWith("msg debug");
  });

  it("should respect minLevel filter", () => {
    router.addTransport(mockLogger, { minLevel: "warn" });

    bus.emit(createEvent("info", "info msg"));
    bus.emit(createEvent("warn", "warn msg"));
    bus.emit(createEvent("error", "error msg"));

    expect(mockLogger.info).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith("warn msg");
    expect(mockLogger.error).toHaveBeenCalledWith("error msg", undefined);
  });

  it("should respect context filter (string)", () => {
    router.addTransport(mockLogger, { contextFilter: "Database" });

    bus.emit(createEvent("info", "db msg", "Database"));
    bus.emit(createEvent("info", "other msg", "Scraper"));
    bus.emit(createEvent("info", "no context msg")); // Should be ignored

    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith("db msg");
  });

  it("should respect context filter (array)", () => {
    router.addTransport(mockLogger, { contextFilter: ["A", "B"] });

    bus.emit(createEvent("info", "msg A", "A"));
    bus.emit(createEvent("info", "msg B", "B"));
    bus.emit(createEvent("info", "msg C", "C"));

    expect(mockLogger.info).toHaveBeenCalledTimes(2);
    expect(mockLogger.info).toHaveBeenCalledWith("msg A");
    expect(mockLogger.info).toHaveBeenCalledWith("msg B");
  });

  it("should handle debug level even if optional in ILogger", () => {
    const loggerWithoutDebug: ILogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      withContext: vi.fn().mockReturnThis()
    };
    router.addTransport(loggerWithoutDebug);

    bus.emit(createEvent("debug", "debug log"));
    // Should not crash even if debug is undefined
  });

  it("should wrap logger with context before dispatching if metadata has context", () => {
    router.addTransport(mockLogger);
    bus.emit(createEvent("info", "hello", "MyService"));

    expect(mockLogger.withContext).toHaveBeenCalledWith("MyService");
  });
});
