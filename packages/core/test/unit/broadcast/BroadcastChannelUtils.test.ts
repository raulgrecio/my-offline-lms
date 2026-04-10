import { describe, it, expect, vi, afterEach } from "vitest";
import { getSafeBroadcastChannel } from "@core/broadcast/BroadcastChannelUtils";

describe("BroadcastChannelUtils", () => {
  const originalBC = global.BroadcastChannel;

  afterEach(() => {
    global.BroadcastChannel = originalBC;
  });

  it("should return a BroadcastChannel if available", () => {
    const channel = getSafeBroadcastChannel("test-channel");
    expect(channel).toBeDefined();
    expect(channel).toBeInstanceOf(BroadcastChannel);
    channel?.close();
  });

  it("should return null if BroadcastChannel is not available", () => {
    // Force undefined
    vi.stubGlobal("BroadcastChannel", undefined);
    
    const channel = getSafeBroadcastChannel("test-channel-null");
    expect(channel).toBeNull();
  });

  it("should call unref if available (Node.js)", () => {
    const unref = vi.fn();
    class MockChannel {
      unref = unref;
      close() {}
    }
    vi.stubGlobal("BroadcastChannel", MockChannel);

    const channel = getSafeBroadcastChannel("test-unref");
    expect(unref).toHaveBeenCalled();
  });

  it("should not fail if unref is not available", () => {
    class MockChannel {
      // no unref
      close() {}
    }
    vi.stubGlobal("BroadcastChannel", MockChannel);

    const channel = getSafeBroadcastChannel("test-no-unref");
    expect(channel).toBeDefined();
  });
});
