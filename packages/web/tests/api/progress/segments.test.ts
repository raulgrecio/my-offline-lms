import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@pages/api/progress/segments";
import * as ProgressFeature from "@features/progress/index";

vi.mock("@features/progress/index", () => ({
  getVisitedSegments: vi.fn(),
}));

describe("Segments API Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a 400 error if assetId or type is missing", async () => {
    const url = new URL("http://localhost/api/progress/segments");
    const response = await GET({ url } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("assetId and type are required");
  });

  it("should return segments for a valid request", async () => {
    const segments = [1, 2, 5];
    vi.mocked(ProgressFeature.getVisitedSegments).mockResolvedValue(segments);

    const url = new URL("http://localhost/api/progress/segments?assetId=test&type=video");
    const response = await GET({ url } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.segments).toEqual(segments);
    expect(ProgressFeature.getVisitedSegments).toHaveBeenCalledWith({
      id: "test",
      type: "video"
    });
  });

  it("should return an empty array if getVisitedSegments returns null", async () => {
    vi.mocked(ProgressFeature.getVisitedSegments).mockResolvedValue(null as any);

    const url = new URL("http://localhost/api/progress/segments?assetId=test&type=guide");
    const response = await GET({ url } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.segments).toEqual([]);
  });
});
