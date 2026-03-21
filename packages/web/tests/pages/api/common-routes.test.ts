import { describe, it, expect, vi } from "vitest";

import { POST as PostActivePath } from "@pages/api/settings/active-path";
import { POST as PostCourseProgress } from "@pages/api/progress/course";
import { POST as PostGuideProgress } from "@pages/api/progress/guide";
import { GET as GetMetadata, POST as PostMetadata } from "@pages/api/assets/metadata";
import { GET as GetAssetPaths, POST as PostAssetPaths, DELETE as DeleteAssetPaths } from "@pages/api/settings/asset-paths";

vi.mock("@features/settings", () => ({
  setActiveLearningPath: vi.fn(),
}));

vi.mock("@features/progress", () => ({
  markCourseStatus: vi.fn(),
  updateGuideProgress: vi.fn(),
}));

vi.mock("@features/courses", () => ({
  getAssetById: vi.fn().mockReturnValue({ metadata: { duration: 100 } }),
  updateAssetTotalPages: vi.fn(),
}));

vi.mock("@my-offline-lms/core", () => {
  function AssetPathResolver() {
    return {
      getAvailablePaths: vi.fn().mockReturnValue([]),
      saveNewPath: vi.fn(),
      removePath: vi.fn(),
    };
  }
  const NodeFileSystem = vi.fn();
  return { AssetPathResolver, NodeFileSystem };
});

describe("API Routes: Common", () => {
  it("active-path POST", async () => {
    const res = await PostActivePath({
      request: new Request("http://l", { method: "POST", body: JSON.stringify({ pathId: "p1" }) })
    } as any);
    expect(res.status).toBe(200);
  });

  it("course-progress POST", async () => {
    const res = await PostCourseProgress({
      request: new Request("http://l", { method: "POST", body: JSON.stringify({ courseId: "c1", status: "completed" }) })
    } as any);
    expect(res.status).toBe(200);
  });

  it("guide-progress POST", async () => {
    const res = await PostGuideProgress({
      request: new Request("http://l", { method: "POST", body: JSON.stringify({ assetId: "a1", courseId: "c1", page: 5, totalPages: 10 }) })
    } as any);
    expect(res.status).toBe(200);
  });

  it("metadata GET/POST", async () => {
    const resGet = await GetMetadata({ url: new URL("http://l?assetId=a1") } as any);
    expect(resGet.status).toBe(200);

    const resPost = await PostMetadata({
      request: new Request("http://l", { method: "POST", body: JSON.stringify({ assetId: "a1", totalPages: 10 }) })
    } as any);
    expect(resPost.status).toBe(200);
  });

  it("asset-paths GET/POST/DELETE", async () => {
    const resGet = await GetAssetPaths({} as any);
    expect(resGet.status).toBe(200);

    const resPost = await PostAssetPaths({
      request: new Request("http://l", { method: "POST", body: JSON.stringify({ path: "/test", label: "test" }) })
    } as any);
    expect(resPost.status).toBe(200);

    const resDel = await DeleteAssetPaths({
      request: new Request("http://l", { method: "DELETE", body: JSON.stringify({ path: "/test" }) })
    } as any);
    expect(resDel.status).toBe(200);
  });

  it("active-path POST - return 400 for missing pathId", async () => {
    const res = await PostActivePath({
      request: new Request("http://l", { method: "POST", body: "{}" })
    } as any);
    expect(res.status).toBe(400);
  });

  it("course-progress POST - return 400 for errors", async () => {
    const res1 = await PostCourseProgress({
      request: new Request("http://l", { method: "POST", body: "{}" })
    } as any);
    expect(res1.status).toBe(400);

    const res2 = await PostCourseProgress({
      request: new Request("http://l", { method: "POST", body: JSON.stringify({ courseId: "c1", status: "invalid" }) })
    } as any);
    expect(res2.status).toBe(400);
  });

  it("guide-progress POST - return 400 for missing fields", async () => {
    const res = await PostGuideProgress({
      request: new Request("http://l", { method: "POST", body: "{}" })
    } as any);
    expect(res.status).toBe(400);
  });

  it("metadata GET - return 400 and 404", async () => {
    const res1 = await GetMetadata({ url: new URL("http://l") } as any);
    expect(res1.status).toBe(400);

    const { getAssetById } = await import("@features/courses");
    vi.mocked(getAssetById).mockReturnValueOnce(null);
    const res2 = await GetMetadata({ url: new URL("http://l?assetId=missing") } as any);
    expect(res2.status).toBe(404);
  });

  it("metadata POST - return 400", async () => {
    const res = await PostMetadata({
      request: new Request("http://l", { method: "POST", body: "{}" })
    } as any);
    expect(res.status).toBe(400);
  });

  it("asset-paths POST/DELETE - return 400", async () => {
    const res1 = await PostAssetPaths({
      request: new Request("http://l", { method: "POST", body: "{}" })
    } as any);
    expect(res1.status).toBe(400);

    const res2 = await DeleteAssetPaths({
      request: new Request("http://l", { method: "DELETE", body: "{}" })
    } as any);
    expect(res2.status).toBe(400);
  });
});
