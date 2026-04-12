import { describe, it, expect } from "vitest";
import VideoPlayer from "@web/ui/modules/video-player/index";
import OriginalVideoPlayer from "@web/ui/modules/video-player/VideoPlayer";

describe("VideoPlayer Index", () => {
  it("should export VideoPlayer by default", () => {
    expect(VideoPlayer).toBe(OriginalVideoPlayer);
  });
});
