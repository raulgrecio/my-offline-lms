import { describe, it, expect, vi, beforeEach } from "vitest";
import { LogBroker } from "@core/logging/LogBroker";
import type { ILogger } from "@core/logging/ILogger";
import type { LogEvent } from "@core/logging/LogEvent";

describe("LogBroker Facade", () => {
  beforeEach(() => {
    LogBroker.clear();
    vi.clearAllMocks();
  });

  const mockLogger: ILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    withContext: vi.fn().mockReturnThis(),
  };

  it("should integrate Bus, History and Router correctly", () => {
    // 1. Setup transport
    LogBroker.addTransport(mockLogger, { minLevel: "info" });
    const subscribeMock = vi.fn();
    LogBroker.subscribe(subscribeMock); // Re-test historical replay support

    // 2. Emit log through facade
    LogBroker.emit("info", "Facade works", undefined, "IntegrationTest");

    // Router must have notified the mockLogger
    expect(mockLogger.info).toHaveBeenCalledWith("Facade works");
    expect(mockLogger.withContext).toHaveBeenCalledWith("IntegrationTest");
    
    // History must have recorded the event
    const history = LogBroker.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].payload.message).toBe("Facade works");
    
    // Subscriber must have received the full LogEvent
    expect(subscribeMock).toHaveBeenCalled();
    const event = subscribeMock.mock.calls[0][0] as LogEvent;
    expect(event.type).toBe("LOG_EMITTED");
    expect(event.payload.message).toBe("Facade works");
    expect(event.metadata.context).toBe("IntegrationTest");
  });

  it("should replay history to new subscribers", () => {
    LogBroker.emit("info", "Historical Message");
    
    const delayedSubscriber = vi.fn();
    LogBroker.subscribe(delayedSubscriber);
    
    expect(delayedSubscriber).toHaveBeenCalledTimes(1);
    expect(delayedSubscriber.mock.calls[0][0].payload.message).toBe("Historical Message");
  });

  it("should clear everything on clear() call", () => {
    LogBroker.emit("info", "Old Message");
    LogBroker.clear();
    expect(LogBroker.getHistory()).toHaveLength(0);
  });

  it("should support unsubscription and default transport options", () => {
    const subscriber = vi.fn();
    const unsub = LogBroker.subscribe(subscriber);
    
    LogBroker.emit("info", "before unsub");
    expect(subscriber).toHaveBeenCalledTimes(1);

    unsub();
    LogBroker.emit("info", "after unsub");
    expect(subscriber).toHaveBeenCalledTimes(1); // No new call

    // Default options check
    LogBroker.addTransport(mockLogger); // Should not throw
    LogBroker.emit("info", "no options test");
    expect(mockLogger.info).toHaveBeenCalledWith("no options test");
  });
});

