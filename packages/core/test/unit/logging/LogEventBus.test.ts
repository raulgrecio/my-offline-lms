import { describe, it, expect, vi } from "vitest";
import { LogEventBus } from "@core/logging/LogEventBus";
import type { LogEvent } from "@core/logging/LogEvent";

describe("LogEventBus", () => {
  const createEvent = (message: string): LogEvent => ({
    type: "LOG_EMITTED",
    payload: { level: "info", message },
    metadata: {
      id: Math.random().toString(36),
      timestamp: new Date().toISOString()
    }
  });

  it("should deregister a subscriber when unsub is called", () => {
    const bus = new LogEventBus();
    const subscriber = vi.fn();
    
    // Subscribe and unsubscribe immediately
    const unsub = bus.subscribe(subscriber);
    unsub();
    
    // Emit should not call the subscriber
    bus.emit(createEvent("nobody hears me"));
    expect(subscriber).not.toHaveBeenCalled();
  });

  it("should broadcast events to multiple subscribers", () => {
    const bus = new LogEventBus();
    const sub1 = vi.fn();
    const sub2 = vi.fn();
    
    bus.subscribe(sub1);
    bus.subscribe(sub2);
    
    bus.emit(createEvent("broadcast"));
    
    expect(sub1).toHaveBeenCalledTimes(1);
    expect(sub2).toHaveBeenCalledTimes(1);
  });
});
