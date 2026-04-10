import { describe, it, expect, vi } from "vitest";

import { LogBroker } from "@core/logging/LogBroker";

// Mock the dependency BEFORE importing LogBroker
vi.mock("@core/broadcast/BroadcastChannelUtils", () => ({
  getSafeBroadcastChannel: vi.fn().mockReturnValue(null),
}));


describe("LogBroker ohne BroadcastChannel", () => {
  it("should not crash when channel is null and emit is called", () => {
    // This hits the coverage branch "if (this.channel)" being false
    expect(() => LogBroker.emit("info", "No channel test")).not.toThrow();
  });
});
