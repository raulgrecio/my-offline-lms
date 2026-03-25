import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@pages/api/settings/active-path";
import * as SettingsFeature from "@features/settings/index";

vi.mock("@features/settings/index", () => ({
  setActiveLearningPath: vi.fn(),
}));

describe("Active Path Setting API Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a 400 error if pathId is missing", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({}), // missing pathId
    } as any;
    const response = await POST({ request } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("pathId is required");
  });

  it("should set active path successfully", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({ pathId: "path-123" }),
    } as any;
    const response = await POST({ request } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(SettingsFeature.setActiveLearningPath).toHaveBeenCalledWith({ id: "path-123" });
  });

  it("should return a 500 error on failure", async () => {
    const request = {
      json: vi.fn().mockRejectedValue(new Error("Parse error")),
    } as any;
    const response = await POST({ request } as any);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
  });
});
