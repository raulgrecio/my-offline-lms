import { describe, it, expect, vi } from "vitest";

import { GET } from "@pages/api/progress/segments";
import { getVisitedSegments } from "@features/progress";

vi.mock("@features/progress", () => ({
  getVisitedSegments: vi.fn(),
}));

describe("API: Progress Segments", () => {
  it("should return 400 if parameters are missing", async () => {
    const url = new URL("http://localhost/api/progress/segments");
    const response = await GET({ url } as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("assetId and type are required");
  });

  it("should return segments and 200 on success", async () => {
    const url = new URL("http://localhost/api/progress/segments?assetId=a1&type=video");
    const mockSegments = [1, 2, 3];
    vi.mocked(getVisitedSegments).mockReturnValue(mockSegments);

    const response = await GET({ url } as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.segments).toEqual(mockSegments);
  });

  it("should return 500 on internal error", async () => {
    const url = new URL("http://localhost/api/progress/segments?assetId=a1&type=video");
    vi.mocked(getVisitedSegments).mockImplementation(() => {
      throw new Error("DB Error");
    });

    const response = await GET({ url } as any);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe("Internal server error");
  });
});
