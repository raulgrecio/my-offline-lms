/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { createTestContainer } from "../utils/test-render";
// @ts-ignore
import VideoPlaylist from "@components/VideoPlaylist.astro";

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
    activeVideoId: "v1",
    courseId: "course-123",
    progressUrl: "/api/progress/video"
  };

  it("should render the section with correct video count", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(VideoPlaylist, { props: defaultProps });

    expect(html).toContain('Vídeos (2)');
    expect(html).toContain('data-course-id="course-123"');
    expect(html).toContain('data-progress-url="/api/progress/video"');
  });

  it("should render the active video title", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(VideoPlaylist, { props: defaultProps });

    expect(html).toContain('id="player-title"');
    expect(html).toContain('Video 1');
  });

  it("should render the video list with correct details", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(VideoPlaylist, { props: defaultProps });

    // Check video items
    expect(html).toContain('data-asset-id="v1"');
    expect(html).toContain('data-asset-id="v2"');
    
    // Check durations
    expect(html).toContain('1:40'); // 100s -> 1:40
    expect(html).toContain('3:20'); // 200s -> 3:20
  });

  it("should mark the active video with active classes", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(VideoPlaylist, { props: defaultProps });

    // Video 1 is active
    expect(html).toContain('bg-surface-700/50');
    expect(html).toContain('text-text-primary font-bold');
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

    // Video 2 is completed, it should contain a check icon inside CircularProgress
    // Since Icon is a React component rendered as static HTML, we check for its path content
    expect(html).toContain('polyline'); 
  });

  it("should render the autoplay toggle", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(VideoPlaylist, { props: defaultProps });

    expect(html).toContain('id="autoplay-toggle"');
    expect(html).toContain('Autoplay');
  });

  it("should show empty title if no active video is found", async () => {
    const container = await createTestContainer();
    const html = await container.renderToString(VideoPlaylist, { 
      props: { ...defaultProps, videos: [], activeVideoId: "none" } 
    });

    expect(html).toContain('Vídeos (0)');
    // player-title should be empty as defined by: {activeVideo?.title ?? ""}
    // We check that the tag is empty or contains whitespace only
    expect(html).toMatch(/id="player-title"[^>]*>\s*<\/p>/);
  });
});
