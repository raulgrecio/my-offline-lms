import { describe, it, expect, vi } from "vitest";
import { CompositeLogger } from "@core/logging/CompositeLogger";
import type { ILogger } from "@core/logging/ILogger";

describe("CompositeLogger", () => {
  const createMockLogger = (): ILogger => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    withContext: vi.fn().mockImplementation((ctx) => createMockLogger()),
  });

  it("should delegate all calls to internal loggers", () => {
    const mock1 = createMockLogger();
    const mock2 = createMockLogger();
    const composite = new CompositeLogger([mock1, mock2]);

    composite.info("message", "ctx");
    expect(mock1.info).toHaveBeenCalledWith("message", "ctx");
    expect(mock2.info).toHaveBeenCalledWith("message", "ctx");

    composite.warn("warning");
    expect(mock1.warn).toHaveBeenCalledWith("warning", undefined);

    const err = new Error("fail");
    composite.error("error", err, "ctx");
    expect(mock1.error).toHaveBeenCalledWith("error", err, "ctx");

    composite.debug("debug");
    expect(mock1.debug).toHaveBeenCalledWith("debug", undefined);
  });

  it("should use default context if none provided", () => {
    const mock = createMockLogger();
    const composite = new CompositeLogger([mock], "default");

    composite.info("msg");
    expect(mock.info).toHaveBeenCalledWith("msg", "default");

    composite.info("msg", "override");
    expect(mock.info).toHaveBeenCalledWith("msg", "override");
  });

  it("should create new composite with contextualized loggers on withContext", () => {
    const mock = createMockLogger();
    const composite = new CompositeLogger([mock]);
    
    const contextual = composite.withContext("new-ctx");
    
    expect(mock.withContext).toHaveBeenCalledWith("new-ctx");
    expect(contextual).toBeInstanceOf(CompositeLogger);
  });
});
