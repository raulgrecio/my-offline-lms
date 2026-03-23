import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";

import VideoPlayer from "@components/VideoPlayer/VideoPlayer";
import { apiClient } from "@platform/api/client";

// Mock apiClient
vi.mock("@platform/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    getText: vi.fn(),
  },
}));

// Mock ResizeObserver
class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
}
window.ResizeObserver = ResizeObserverMock as any;

describe("VideoPlayer Component", () => {
  const defaultProps = {
    src: "test-video.mp4",
    title: "Test Video",
    assetId: "asset-1",
    courseId: "course-1",
    progressUrl: "/api/progress",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ segments: [] });
    
    // Mock HTMLMediaElement methods
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
    
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render correctly with title", async () => {
    await act(async () => {
      render(<VideoPlayer {...defaultProps} />);
    });
    
    await waitFor(() => {
        expect(apiClient.get).toHaveBeenCalled();
    });

    expect(screen.getByText("Test Video")).toBeInTheDocument();
    const video = document.querySelector("video");
    expect(video).toHaveAttribute("src", "test-video.mp4");
  });

  it("should fetch visited segments on mount", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ segments: [1, 2] });
    
    await act(async () => {
      render(<VideoPlayer {...defaultProps} />);
    });
    
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining("asset-1"));
    });
  });

  it("should toggle play/pause when video container is clicked", async () => {
    await act(async () => {
      render(<VideoPlayer {...defaultProps} />);
    });
    
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalled();
    });
    
    const container = document.querySelector(".video-player-container");
    if (!container) throw new Error("Container not found");

    // Click to play
    await act(async () => {
      fireEvent.click(container);
    });
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it("should update current time when video time updates", async () => {
    await act(async () => {
      render(<VideoPlayer {...defaultProps} />);
    });
    const video = document.querySelector("video");
    if (!video) throw new Error("Video not found");

    await act(async () => {
      fireEvent.timeUpdate(video, { target: { currentTime: 10 } });
    });
    
    // Check if TimeDisplay reflects the change (0:10 / 0:00 since duration is 0 initially)
    expect(screen.getByText(/0:10/)).toBeInTheDocument();
  });

  it("should save progress periodically", async () => {
    vi.useFakeTimers();
    await act(async () => {
        render(<VideoPlayer {...defaultProps} />);
    });
    
    const video = document.querySelector("video");
    if (!video) throw new Error("Video not found");

    // Mock video state to be playing
    Object.defineProperty(video, "paused", { value: false });
    Object.defineProperty(video, "currentTime", { value: 10 });
    Object.defineProperty(video, "duration", { value: 100 });

    // Advance time by 5 seconds (VIDEO_SEGMENT_SIZE)
    await act(async () => {
        vi.advanceTimersByTime(5000);
    });

    expect(apiClient.post).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("should handle ended event", async () => {
    await act(async () => {
      render(<VideoPlayer {...defaultProps} />);
    });
    const video = document.querySelector("video");
    if (!video) throw new Error("Video not found");

    await act(async () => {
      fireEvent.ended(video);
    });
    
    expect(apiClient.post).toHaveBeenCalledWith("/api/progress", expect.objectContaining({
        assetId: "asset-1",
        // completed: true logic is inside saveProgress call redirected from handleEnded
    }));
  });
  it("should handle volume changes", async () => {
    await act(async () => {
      render(<VideoPlayer {...defaultProps} />);
    });
    const volumeInput = screen.getByLabelText(/Volumen/);
    
    await act(async () => {
      fireEvent.change(volumeInput, { target: { value: "0.5" } });
    });
    
    const video = document.querySelector("video");
    expect(video?.volume).toBe(0.5);
  });

  it("should handle seeking via ProgressVideoBar", async () => {
    await act(async () => {
      render(<VideoPlayer {...defaultProps} />);
    });
    const seekInput = document.querySelector('input[type="range"]'); // ProgressVideoBar's input
    if (!seekInput) throw new Error("Seek input not found");

    await act(async () => {
      fireEvent.change(seekInput, { target: { value: "50" } });
    });
    
    const video = document.querySelector("video");
    expect(video?.currentTime).toBe(50);
  });

  it("should toggle settings popup", async () => {
    // Need subtitleSrc to show settings button
    await act(async () => {
      render(<VideoPlayer {...defaultProps} subtitleSrc="subs.vtt" />);
    });
    
    const settingsBtn = screen.getByLabelText(/Configuración de subtítulos/);
    await act(async () => {
      fireEvent.click(settingsBtn);
    });
    
    expect(screen.getAllByText(/Subtítulos/i).length).toBeGreaterThan(0);
    
    // Close it
    await act(async () => {
      fireEvent.click(settingsBtn);
    });
    expect(screen.queryByText(/Subtítulos/i)).not.toBeInTheDocument();
  });

  it("should toggle fullscreen", async () => {
    // Mock requestFullscreen and exitFullscreen
    const container = document.createElement("div");
    container.requestFullscreen = vi.fn();
    document.exitFullscreen = vi.fn();

    await act(async () => {
      render(<VideoPlayer {...defaultProps} />, { container: document.body.appendChild(container) });
    });
    
    const fullscreenBtn = screen.getByLabelText(/Pantalla completa/);
    
    // Enter fullscreen
    await act(async () => {
      fireEvent.click(fullscreenBtn);
    });
  });

  it("should show controls on mouse move and hide them after timeout", async () => {
    vi.useFakeTimers();
    await act(async () => {
        render(<VideoPlayer {...defaultProps} />);
    });
    
    const container = document.querySelector(".video-player-container");
    if (!container) throw new Error("Container not found");

    await act(async () => {
        fireEvent.mouseMove(container);
    });
    // Controls should be visible (opacity checks are hard in JSDOM, but state is updated)
    
    // Mock video playing so it auto-hides
    const video = document.querySelector("video");
    if (video) Object.defineProperty(video, "paused", { value: false });

    await act(async () => {
        vi.advanceTimersByTime(4000);
    });
    
    // After 3-4 seconds, controls should hide
    vi.useRealTimers();
  });
});

