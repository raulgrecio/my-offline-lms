import { describe, it, expect } from "vitest";

import { API_ROUTES } from "@web/platform/api";
import { APP_ROUTES } from "@web/platform/router";

describe("Route Constants", () => {
  describe("API_ROUTES", () => {
    it("should generate correct local asset URL", () => {
      const url = API_ROUTES.ASSETS.LOCAL_ASSET("foo/bar.pdf");
      expect(url).toContain("path=foo%2Fbar.pdf");
    });

    it("should generate correct metadata URL with assetId", () => {
      const url = API_ROUTES.ASSETS.METADATA("a1");
      expect(url).toBe("/api/assets/metadata?assetId=a1");
    });

    it("should generate correct segments URL", () => {
      const url = API_ROUTES.PROGRESS.SEGMENTS("a1", "video");
      expect(url).toBe("/api/progress/segments?assetId=a1&type=video");
    });
  });

  describe("APP_ROUTES", () => {
    it("should generate correct course detail URL", () => {
      const url = APP_ROUTES.COURSES.DETAIL("c1");
      expect(url).toBe("/courses/c1");
    });

    it("should generate correct viewer URL", () => {
      const url = APP_ROUTES.VIEWER.GUIDE({ assetId: "a1", courseId: "c1", path: "test.pdf" });
      expect(url).toBe("/viewer/?assetId=a1&courseId=c1&path=test.pdf");
    });
  });
});
