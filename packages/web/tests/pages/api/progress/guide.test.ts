import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@web/pages/api/progress/guide";
import * as ProgressFeature from "@web/features/progress/index";

vi.mock("@web/features/progress/index", () => ({
  updateGuideProgress: vi.fn(),
}));

describe("Guide Progress API Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a 400 error if assetId, courseId or page is missing", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({ assetId: "1", courseId: "2" }), // missing page
    } as any;
    const response = await POST({ request } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("assetId, courseId and page are required");
  });

  it("should update guide progress successfully", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({ assetId: "g1", courseId: "c1", page: 5, totalPages: 10 }),
    } as any;
    const response = await POST({ request } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(ProgressFeature.updateGuideProgress).toHaveBeenCalledWith({
      assetId: "g1",
      id: "c1",
      position: 5,
      duration: 10
    });
  });

  it("should update guide progress without totalPages successfully", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({ assetId: "g1", courseId: "c1", page: 5 }),
    } as any;
    const response = await POST({ request } as any);

    expect(response.status).toBe(200);
    expect(ProgressFeature.updateGuideProgress).toHaveBeenCalledWith({
      assetId: "g1",
      id: "c1",
      position: 5,
      duration: undefined
    });
  });

  it("should return a 500 error on update failure", async () => {
    const request = {
      json: vi.fn().mockRejectedValue(new Error("Parse error")),
    } as any;
    const response = await POST({ request } as any);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
  });
});
