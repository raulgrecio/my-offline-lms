import { describe, it, expect, vi, beforeEach } from "vitest";

import { apiClient } from "@web/platform/api";

describe("apiClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("get should call fetch and return parsed JSON", async () => {
    const mockJson = { data: "test" };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockJson),
    } as Response);

    const result = await apiClient.get("/test");

    expect(fetch).toHaveBeenCalledWith("/test", undefined);
    expect(result).toEqual(mockJson);
  });

  it("post should call fetch with body and return parsed JSON", async () => {
    const mockJson = { success: true };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockJson),
    } as Response);

    const result = await apiClient.post("/test", { foo: "bar" });

    expect(fetch).toHaveBeenCalledWith("/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foo: "bar" }),
    });
    expect(result).toEqual(mockJson);
  });

  it("should throw error if response is not ok", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: () => Promise.resolve({ error: "Custom Error" }),
    } as Response);

    await expect(apiClient.get("/test")).rejects.toThrow("Custom Error");
  });
});
