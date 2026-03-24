import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../../../src/pages/api/progress/course";
import * as ProgressFeature from "@features/progress";

vi.mock("@features/progress", () => ({
  markCourseStatus: vi.fn(),
}));

describe("Course Progress status API Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a 400 error if courseId or status is missing", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({ courseId: "test-course" }), // Missing status
    } as any;
    const response = await POST({ request } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("courseId and status are required");
  });

  it("should return a 400 error for invalid status value", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({ courseId: "test-course", status: "finished" }),
    } as any;
    const response = await POST({ request } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("status must be one of:");
  });

  it("should update course status successfully", async () => {
    const request = {
      json: vi.fn().mockResolvedValue({ courseId: "test-course", status: "completed" }),
    } as any;
    const response = await POST({ request } as any);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(ProgressFeature.markCourseStatus).toHaveBeenCalledWith({
      id: "test-course",
      status: "completed",
    });
  });

  it("should return a 500 error on update failure", async () => {
    const request = {
      json: vi.fn().mockRejectedValue(new Error("Progress error")),
    } as any;
    const response = await POST({ request } as any);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
  });
});
