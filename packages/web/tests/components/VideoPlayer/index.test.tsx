import { describe, it, expect } from "vitest";
import VideoPlayer from "@components/VideoPlayer/index";
import OriginalVideoPlayer from "@components/VideoPlayer/VideoPlayer";

describe("VideoPlayer Index", () => {
  it("should export VideoPlayer by default", () => {
    expect(VideoPlayer).toBe(OriginalVideoPlayer);
  });
});
