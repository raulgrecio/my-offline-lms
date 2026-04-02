import { describe, it, expect } from "vitest";
import VideoPlayer from "@web/components/VideoPlayer/index";
import OriginalVideoPlayer from "@web/components/VideoPlayer/VideoPlayer";

describe("VideoPlayer Index", () => {
  it("should export VideoPlayer by default", () => {
    expect(VideoPlayer).toBe(OriginalVideoPlayer);
  });
});
