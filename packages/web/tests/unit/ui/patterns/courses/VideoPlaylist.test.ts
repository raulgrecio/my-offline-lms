/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../../../utils/test-render";
// @ts-ignore
import VideoPlaylist from "@web/ui/patterns/courses/VideoPlaylist.astro";

describe("VideoPlaylist.astro", () => {
  const mockVideos = [
    {
      id: "v1",
      title: "Video 1",
      src: "file:///path/to/video1.mp4",
      subtitleSrc: "file:///path/to/video1.vtt",
      duration: 100,
      progress: { position: 10, completed: false }
    },
    {
      id: "v2",
      title: "Video 2",
      src: "file:///path/to/video2.mp4",
      duration: 200,
      progress: { position: 200, completed: true }
    }
  ];

  const defaultProps = {
    videos: mockVideos,
    activeVideoId: "v1"
  };

  it("should render the video list container", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(VideoPlaylist, { props: defaultProps });

    expect(html).toContain('video-playlist-sidebar');
    expect(html).toContain('Contenido');
  });

  it("should render the video items with correct details", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(VideoPlaylist, { props: defaultProps });

    expect(html).toContain('data-asset-id="v1"');
    expect(html).toContain('data-asset-id="v2"');
    
    expect(html).toContain('1:40'); // 100s -> 1:40
    expect(html).toContain('3:20'); // 200s -> 3:20
  });

  it("should mark the active video with active classes", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(VideoPlaylist, { props: defaultProps });

    // Video 1 is active (v1)
    // We check for the background class that marks it as active
    expect(html).toContain('bg-surface-700/50');
  });

  it("should render progress information for in-progress videos", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(VideoPlaylist, { props: defaultProps });

    // Video 1 is 10% (10/100)
    expect(html).toContain('width: 10%');
    expect(html).toContain('10%');
  });

  it("should render completed state for completed videos", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(VideoPlaylist, { props: defaultProps });

    // Video 2 is completed, it should contain a check icon (polyline)
    expect(html).toContain('polyline'); 
  });

  it("should render the autoplay toggle", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(VideoPlaylist, { props: defaultProps });

    expect(html).toContain('id="autoplay-toggle"');
    expect(html).toContain('Autoplay');
  });
});
