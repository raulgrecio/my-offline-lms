import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "../../src/platform/api/client";
import { APP_ROUTES } from "../../src/platform/router/routes";

describe("Platform Utilities", () => {
  describe("apiClient", () => {
    beforeEach(() => {
      vi.stubGlobal("fetch", vi.fn());
    });

    it("should handle successful requests", async () => {
      const mockResponse = { ok: true, json: () => Promise.resolve({ data: "win" }) };
      (fetch as any).mockResolvedValue(mockResponse);

      const result = await apiClient.get("/test");
      expect(result).toEqual({ data: "win" });
      expect(fetch).toHaveBeenCalledWith("/test", undefined);
    });

    it("should handle text requests", async () => {
        const mockResponse = { ok: true, text: () => Promise.resolve("hello") };
        (fetch as any).mockResolvedValue(mockResponse);
  
        const result = await apiClient.getText("/test");
        expect(result).toBe("hello");
      });

    it("should throw error on failed requests with msg", async () => {
      const mockResponse = { 
        ok: false, 
        statusText: "Not Found", 
        status: 404,
        json: () => Promise.resolve({ error: "Something bad" }) 
      };
      (fetch as any).mockResolvedValue(mockResponse);

      await expect(apiClient.request("/test")).rejects.toThrow("Something bad");
    });

    it("should throw error on failed requests without msg", async () => {
        const mockResponse = { 
          ok: false, 
          statusText: "Not Found", 
          status: 404,
          json: () => Promise.reject("no json") 
        };
        (fetch as any).mockResolvedValue(mockResponse);
  
        await expect(apiClient.request("/test")).rejects.toThrow("API Error: Not Found (404)");
      });

    it("should perform POST requests", async () => {
      const mockResponse = { ok: true, json: () => Promise.resolve({ success: true }) };
      (fetch as any).mockResolvedValue(mockResponse);

      await apiClient.post("/test", { foo: "bar" });
      expect(fetch).toHaveBeenCalledWith("/test", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ foo: "bar" }),
      }));
    });

    it("should perform DELETE requests", async () => {
        const mockResponse = { ok: true, json: () => Promise.resolve({ deleted: true }) };
        (fetch as any).mockResolvedValue(mockResponse);
  
        await apiClient.delete("/test", { id: "1" });
        expect(fetch).toHaveBeenCalledWith("/test", expect.objectContaining({
          method: "DELETE",
          body: JSON.stringify({ id: "1" }),
        }));
      });

    it("should handle POST and DELETE without body", async () => {
        const mockResponse = { ok: true, json: () => Promise.resolve({ ok: true }) };
        (fetch as any).mockResolvedValue(mockResponse);
  
        await apiClient.post("/test");
        expect(fetch).toHaveBeenCalledWith("/test", expect.objectContaining({ body: undefined }));

        await apiClient.delete("/test");
        expect(fetch).toHaveBeenCalledWith("/test", expect.objectContaining({ body: undefined }));
      });
  });

  describe("APP_ROUTES", () => {
    it("should generate correct routes", () => {
      expect(APP_ROUTES.HOME).toBe("/");
      expect(APP_ROUTES.COURSES.INDEX).toBe("/courses");
      expect(APP_ROUTES.COURSES.DETAIL("123")).toBe("/courses/123");
      expect(APP_ROUTES.COURSES.WITH_FILTER(true)).toBe("/courses?all=true");
      expect(APP_ROUTES.LEARNING_PATHS.INDEX).toBe("/learning-paths");
      expect(APP_ROUTES.LEARNING_PATHS.DETAIL("p1")).toBe("/learning-paths/p1");
      expect(APP_ROUTES.VIEWER.GUIDE({ assetId: "a1", courseId: "c1", path: "test.pdf" }))
        .toContain("assetId=a1");
      expect(APP_ROUTES.SETTINGS).toBe("/settings");
    });
  });
});
