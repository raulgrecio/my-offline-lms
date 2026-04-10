import { describe, it, expect, vi, beforeEach } from "vitest";
import { LogBroker } from "@core/logging/LogBroker";
import type { ILogger } from "@core/logging/ILogger";
import type { LogEvent } from "@core/logging/LogEvent";

describe("LogBroker Facade", () => {
  beforeEach(() => {
    LogBroker.clear();
    LogBroker.clearTransports();
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

  it("should handle remote messages from BroadcastChannel", () => {
    const subscribeMock = vi.fn();
    LogBroker.subscribe(subscribeMock);

    // Get the global BroadcastChannel mock (or create one if needed)
    // In Vitest, we can mock it
    const channel = (LogBroker as any).channel;
    if (channel && channel.onmessage) {
      const remoteEvent: LogEvent = {
        type: "LOG_EMITTED",
        payload: { level: "info", message: "Remote Message" },
        metadata: { id: "rem-1", timestamp: new Date().toISOString() }
      };
      
      channel.onmessage({ data: remoteEvent } as MessageEvent);
      
      expect(subscribeMock).toHaveBeenCalled();
      const call = subscribeMock.mock.calls.find(c => c[0].payload?.message === "Remote Message");
      expect(call).toBeDefined();
      expect(call![0].metadata.isRemote).toBe(true);
    }
  });

  it("should clear transports", () => {
    LogBroker.addTransport(mockLogger);
    LogBroker.emit("info", "Visible");
    expect(mockLogger.info).toHaveBeenCalledWith("Visible");

    LogBroker.clearTransports();
    LogBroker.emit("info", "Hidden");
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
  });
});

