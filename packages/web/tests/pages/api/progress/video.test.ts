import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@pages/api/progress/video";
import * as ProgressFeature from "@features/progress/index";

vi.mock("@features/progress/index", () => ({
  updateVideoProgress: vi.fn(),
}));

describe("Video Progress API Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a 400 error if assetId, courseId or position is missing", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({ assetId: "1", courseId: "2" }), // missing position
    } as any;
    const response = await POST({ request } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("assetId, courseId and position are required");
  });

  it("should update video progress successfully", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({ assetId: "v1", courseId: "c1", position: 100, duration: 300 }),
    } as any;
    const response = await POST({ request } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(ProgressFeature.updateVideoProgress).toHaveBeenCalledWith({
      assetId: "v1",
      id: "c1",
      position: 100,
      duration: 300
    });
  });

  it("should update video progress without duration successfully", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({ assetId: "v1", courseId: "c1", position: 120 }),
    } as any;
    const response = await POST({ request } as any);

    expect(response.status).toBe(200);
    expect(ProgressFeature.updateVideoProgress).toHaveBeenCalledWith({
      assetId: "v1",
      id: "c1",
      position: 120,
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
