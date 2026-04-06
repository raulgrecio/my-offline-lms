import { describe, it, expect, beforeEach } from "vitest";
import { LogHistory } from "@core/logging/LogHistory";
import { LogEventBus } from "@core/logging/LogEventBus";
import type { LogEvent } from "@core/logging/LogEvent";

describe("LogHistory", () => {
  let bus: LogEventBus;
  let history: LogHistory;

  beforeEach(() => {
    bus = new LogEventBus();
    history = new LogHistory(bus, 5); // Small limit for easier testing
  });

  const createEvent = (level: any, message: string): LogEvent => ({
    type: "LOG_EMITTED",
    payload: { level, message },
    metadata: {
      id: Math.random().toString(36),
      timestamp: new Date().toISOString()
    }
  });

  it("should record log events from the bus", () => {
    bus.emit(createEvent("info", "msg 1"));
    bus.emit(createEvent("warn", "msg 2"));

    expect(history.getEntries()).toHaveLength(2);
    expect(history.getEntries()[0].payload.message).toBe("msg 1");
  });

  it("should skip debug events to keep history clean", () => {
    bus.emit(createEvent("debug", "debug msg"));
    expect(history.getEntries()).toHaveLength(0);
  });

  it("should respect MAX_HISTORY limit by oldest deletion", () => {
    bus.emit(createEvent("info", "msg 1"));
    bus.emit(createEvent("info", "msg 2"));
    bus.emit(createEvent("info", "msg 3"));
    bus.emit(createEvent("info", "msg 4"));
    bus.emit(createEvent("info", "msg 5"));
    bus.emit(createEvent("info", "msg 6")); // This should push out msg 1

    const entries = history.getEntries();
    expect(entries).toHaveLength(5);
    expect(entries[0].payload.message).toBe("msg 2");
  });

  it("should clear the history when requested", () => {
    bus.emit(createEvent("info", "msg 1"));
    history.clear();
    expect(history.getEntries()).toHaveLength(0);
  });
});
