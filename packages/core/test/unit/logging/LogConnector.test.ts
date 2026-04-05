import { describe, it, expect, vi, beforeEach } from "vitest";

import { LogConnector } from "@core/logging/LogConnector";
import { LogBroker } from "@core/logging/LogBroker";
import type { ILogger } from "@core/logging/ILogger";

describe("LogConnector", () => {
  beforeEach(() => {
    LogBroker.clear();
    vi.clearAllMocks();
  });
  const createMockLogger = (): ILogger => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    withContext: vi.fn().mockImplementation(() => createMockLogger()),
  });

  it("should dispatch events to the connected logger", () => {
    const mock = createMockLogger();
    LogConnector.connect(mock, LogBroker);

    LogBroker.emit("info", "test info");
    expect(mock.info).toHaveBeenCalledWith("test info");

    LogBroker.emit("warn", "test warn");
    expect(mock.warn).toHaveBeenCalledWith("test warn");

    const error = new Error("test error");
    LogBroker.emit("error", "fail", error);
    expect(mock.error).toHaveBeenCalledWith("fail", error);
  });

  it("should handle contexts through withContext", () => {
    const mock = createMockLogger();
    const contextualMock = createMockLogger();
    (mock.withContext as any).mockReturnValue(contextualMock);

    LogConnector.connect(mock, LogBroker);

    LogBroker.emit("info", "contextual msg", undefined, "my-context");

    expect(mock.withContext).toHaveBeenCalledWith("my-context");
    expect(contextualMock.info).toHaveBeenCalledWith("contextual msg");
  });

  it("should return an unsubscribe function", () => {
    const mock = createMockLogger();
    const unsubscribe = LogConnector.connect(mock, LogBroker);

    unsubscribe();
    LogBroker.emit("info", "should be ignored");

    expect(mock.info).not.toHaveBeenCalled();
  });
});
