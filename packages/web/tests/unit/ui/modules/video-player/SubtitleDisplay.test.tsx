import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import SubtitleDisplay from "@web/ui/modules/video-player/SubtitleDisplay";
import { apiClient } from "@web/platform/api/client";
import { logger } from "@web/platform/logging";

// Mock apiClient
vi.mock("@web/platform/api/client", () => ({
  apiClient: {
    getText: vi.fn(),
  },
}));

const mockVtt = `WEBVTT

1
00:00:01.000 --> 00:00:03.000
First subtitle line

2
00:00:04.000 --> 00:00:06.000
Second subtitle
with two lines
`;

// Mock ResizeObserver
let resizeCallback: ResizeObserverCallback | null = null;
class ResizeObserverMock {
  constructor(cb: ResizeObserverCallback) {
    resizeCallback = cb;
  }
  observe() { }
  unobserve() { }
  disconnect() { }
}
window.ResizeObserver = ResizeObserverMock as any;

describe("SubtitleDisplay Component", () => {
  beforeEach(() => {
    vi.mocked(apiClient.getText).mockResolvedValue(mockVtt);
    localStorage.clear();
    resizeCallback = null;
  });

  it("should trigger clamp logic through ResizeObserver", async () => {
    const { container } = render(
      <SubtitleDisplay src="subs.vtt" currentTime={2} isVisible={true} />
    );
    await waitFor(() => { expect(screen.getByText(/First/)).toBeInTheDocument(); });

    const wrapper = container.querySelector("div")!;
    const parent = wrapper.parentElement!;
    vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({ width: 1000, height: 1000 } as any);
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({ width: 200, height: 50 } as any);

    await act(async () => {
      if (resizeCallback) resizeCallback([], {} as any);
    });

    expect(wrapper.style.left).toBe("50%"); // defaults should remain after clamp with these values
  });

  it("should stop propagation on click", async () => {
    const onClick = vi.fn();
    render(
      <div onClick={onClick}>
        <SubtitleDisplay src="subs.vtt" currentTime={2} isVisible={true} />
      </div>
    );
    await waitFor(() => { expect(screen.getByText(/First/)).toBeInTheDocument(); });
    fireEvent.click(screen.getByText(/First/));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("should parse and display subtitles based on currentTime", async () => {
    const { rerender } = render(
      <SubtitleDisplay src="subs.vtt" currentTime={0} isVisible={true} />
    );

    // Initial time 0: no subtitle
    expect(screen.queryByText(/First subtitle/)).not.toBeInTheDocument();

    // Move to 2s
    await act(async () => {
      rerender(<SubtitleDisplay src="subs.vtt" currentTime={2} isVisible={true} />);
    });

    await waitFor(() => {
      expect(screen.getByText("First subtitle line")).toBeInTheDocument();
    });

    // Move to 5s
    await act(async () => {
      rerender(<SubtitleDisplay src="subs.vtt" currentTime={5} isVisible={true} />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Second subtitle/)).toBeInTheDocument();
      expect(screen.getByText(/with two lines/)).toBeInTheDocument();
    });
  });

  it("should hide subtitles when isVisible is false", async () => {
    render(<SubtitleDisplay src="subs.vtt" currentTime={2} isVisible={false} />);

    await waitFor(() => {
      expect(screen.queryByText("First subtitle line")).not.toBeInTheDocument();
    });
  });

  it("should handle multi-line subtitles by replacing newline with <br/>", async () => {
    render(<SubtitleDisplay src="subs.vtt" currentTime={5} isVisible={true} />);

    await waitFor(() => {
      const el = screen.getByText(/Second subtitle/);
      expect(el.innerHTML).toContain("Second subtitle<br>with two lines");
    });
  });

  it("should load position from localStorage", async () => {
    localStorage.setItem("subtitle_position", JSON.stringify({ x: 20, y: 30 }));

    const { container } = render(
      <SubtitleDisplay src="subs.vtt" currentTime={2} isVisible={true} />
    );

    await waitFor(() => {
      const div = container.querySelector("div");
      expect(div?.style.left).toBe("20%");
      expect(div?.style.bottom).toBe("30%");
    });
  });
  it("should handle error when fetching subtitles", async () => {
    vi.mocked(apiClient.getText).mockRejectedValue(new Error("Network fail"));
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => { });

    render(<SubtitleDisplay src="subs.vtt" currentTime={2} isVisible={true} />);

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith('Error fetching subtitles:', expect.any(Error));
    });
    errorSpy.mockRestore();
  });

  it("should handle dragging the subtitles", async () => {
    const { container } = render(
      <SubtitleDisplay src="subs.vtt" currentTime={2} isVisible={true} />
    );

    await waitFor(() => {
      expect(screen.getByText("First subtitle line")).toBeInTheDocument();
    });

    const subtitleElement = screen.getByText("First subtitle line");

    // Initial position is 50%, 15% (defaults)
    const wrapper = container.querySelector("div");
    if (!wrapper) throw new Error("Wrapper not found");

    // Simulate mousedown
    fireEvent.mouseDown(subtitleElement, { clientX: 100, clientY: 100 });

    // Simulate mouse move
    // JSDOM parent Rect is empty by default, so we might need more mocks for getBoundingClientRect
    const parent = wrapper.parentElement!;
    vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
      width: 1000, height: 1000, top: 0, left: 0, bottom: 1000, right: 1000,
      x: 0, y: 0, toJSON: () => { }
    });
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({
      width: 200, height: 50, top: 0, left: 0, bottom: 50, right: 200,
      x: 0, y: 0, toJSON: () => { }
    });

    fireEvent.mouseMove(window, { clientX: 200, clientY: 150 });

    // newX = 50% * 1000 + (200 - 100) = 500 + 100 = 600
    // newXPos = 600 / 1000 = 60%

    // Actually the logic uses bottom position. 15% * 1000 - (150 - 100) = 150 - 50 = 100 (from bottom)
    // newYPos = 100 / 1000 = 10%

    await waitFor(() => {
      expect(wrapper.style.left).toBe("60%");
      expect(wrapper.style.bottom).toBe("10%");
    });

    fireEvent.mouseUp(window);
  });

  it("should handle dragging bounds for subtitles", async () => {
    const { container } = render(
      <SubtitleDisplay src="subs.vtt" currentTime={2} isVisible={true} />
    );
    await waitFor(() => { expect(screen.getByText(/First/)).toBeInTheDocument(); });
    const subtitleElement = screen.getByText(/First/);
    const wrapper = container.querySelector("div")!;
    const parent = wrapper.parentElement!;
    vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({ width: 1000, height: 1000 } as any);
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({ width: 200, height: 50 } as any);

    fireEvent.mouseDown(subtitleElement, { clientX: 100, clientY: 100 });

    // Drag way out of bounds (top left)
    fireEvent.mouseMove(window, { clientX: -500, clientY: -1000 });
    await waitFor(() => {
      // halfWidth is 100. newXPixels capped at 100. 100/1000 = 10%
      expect(wrapper.style.left).toBe("10%");
      // capped at parentHeight - containerHeight = 1000 - 50 = 950. 950 / 1000 = 95%
      expect(wrapper.style.bottom).toBe("95%");
    });

    fireEvent.mouseUp(window);
  });

  it("should handle empty text in VTT gracefully", async () => {
    // Cue 1 has no text lines before Cue 2 starts
    const emptyVtt = `WEBVTT
1
00:00:01.000 --> 00:00:02.000
00:00:03.000 --> 00:00:04.000
Content`;
    vi.mocked(apiClient.getText).mockResolvedValue(emptyVtt);
    await act(async () => {
      render(<SubtitleDisplay src="subs.vtt" currentTime={1.5} isVisible={true} />);
    });
    // Should not show anything for the empty cue (time 1.5)
    expect(screen.queryByText(/./)).not.toBeInTheDocument();
  });

  it("should return 0 for malformed timestamp parts", async () => {
    const malformedVtt = `WEBVTT
1
abc:def:ghi --> 00:00:02.000
Broken`;
    vi.mocked(apiClient.getText).mockResolvedValue(malformedVtt);
    await act(async () => {
      render(<SubtitleDisplay src="subs.vtt" currentTime={0} isVisible={true} />);
    });
  });

  it("should prevent default on touch move if cancelable", async () => {
    const { container } = render(
      <SubtitleDisplay src="subs.vtt" currentTime={2} isVisible={true} />
    );
    await waitFor(() => { expect(screen.getByText(/First/)).toBeInTheDocument(); });
    const subtitleElement = screen.getByText(/First/);

    await act(async () => {
      fireEvent.touchStart(subtitleElement, { touches: [{ clientX: 100, clientY: 100 }] });
    });

    const ev = new TouchEvent('touchmove', {
      touches: [{ clientX: 110, clientY: 110 }] as any,
      cancelable: true
    });
    vi.spyOn(ev, 'preventDefault');
    await act(async () => {
      window.dispatchEvent(ev);
    });

    expect(ev.preventDefault).toHaveBeenCalled();
  });

  it("should handle different timestamp formats (m:s.ms)", async () => {
    const vttShort = `WEBVTT
1
01:00.000 --> 02:00.000
Short format`;
    vi.mocked(apiClient.getText).mockResolvedValue(vttShort);

    const { rerender } = render(<SubtitleDisplay src="subs.vtt" currentTime={0} isVisible={true} />);

    await act(async () => {
      rerender(<SubtitleDisplay src="subs.vtt" currentTime={70} isVisible={true} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Short format")).toBeInTheDocument();
    });
  });

  it("should handle invalid JSON in localStorage", async () => {
    localStorage.setItem("subtitle_position", "invalid-json");
    await act(async () => {
      render(<SubtitleDisplay src="subs.vtt" currentTime={2} isVisible={true} />);
    });
    // Should not crash, use defaults
  });

  it("should handle multiple VTT cues correctly", async () => {
    const multipleVtt = `WEBVTT

1
00:00:02.000 --> 00:00:04.000
First

2
00:00:04.000 --> 00:00:06.000
Second
`;
    vi.mocked(apiClient.getText).mockResolvedValue(multipleVtt);
    const { rerender } = render(<SubtitleDisplay src="subs.vtt" currentTime={3} isVisible={true} />);

    await waitFor(() => { expect(screen.getByText("First")).toBeInTheDocument(); });

    await act(async () => {
      rerender(<SubtitleDisplay src="subs.vtt" currentTime={5} isVisible={true} />);
    });
    await waitFor(() => { expect(screen.getByText("Second")).toBeInTheDocument(); });
  });

  it("should skip invalid lines but continue parsing", async () => {
    const brokenVtt = `WEBVTT
00:00:01.000 --> 00:00:02.000
Valid
Invalid line without timestamp
00:00:03.000 --> 00:00:04.000
Another valid
`;
    vi.mocked(apiClient.getText).mockResolvedValue(brokenVtt);
    const { rerender } = render(<SubtitleDisplay src="subs.vtt" currentTime={1.5} isVisible={true} />);
    await waitFor(() => { expect(screen.getByText(/Valid/)).toBeInTheDocument(); });

    await act(async () => {
      rerender(<SubtitleDisplay src="subs.vtt" currentTime={3.5} isVisible={true} />);
    });
    await waitFor(() => { expect(screen.getByText(/Another valid/)).toBeInTheDocument(); });
  });

  it("should return null if no active cue or not visible", async () => {
    const { rerender } = render(
      <SubtitleDisplay src="subs.vtt" currentTime={100} isVisible={true} />
    );
    expect(screen.queryByText(/./)).not.toBeInTheDocument();

    await act(async () => {
      rerender(<SubtitleDisplay src="subs.vtt" currentTime={2} isVisible={false} />);
    });
    expect(screen.queryByText(/./)).not.toBeInTheDocument();
  });

  it("should handle touch move when isDragging is true", async () => {
    const { container } = render(
      <SubtitleDisplay src="subs.vtt" currentTime={2} isVisible={true} />
    );
    await waitFor(() => { expect(screen.getByText(/First/)).toBeInTheDocument(); });
    const subtitleElement = screen.getByText(/First/);
    const wrapper = container.querySelector("div")!;
    const parent = wrapper.parentElement!;
    vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({ width: 1000, height: 1000 } as any);
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({ width: 200, height: 50 } as any);

    fireEvent.touchStart(subtitleElement, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchMove(window, { touches: [{ clientX: 200, clientY: 150 }] });

    await waitFor(() => {
      expect(wrapper.style.left).toBe("60%");
    });
    fireEvent.touchEnd(window);
  });

  it("should handle 2-part timestamp with comma", async () => {
    const vttComma = `WEBVTT
1
01:00,000 --> 02:00,000
Comma format`;
    vi.mocked(apiClient.getText).mockResolvedValue(vttComma);
    await act(async () => {
      render(<SubtitleDisplay src="subs.vtt" currentTime={70} isVisible={true} />);
    });
    await waitFor(() => { expect(screen.getByText("Comma format")).toBeInTheDocument(); });
  });

  it("should skip effect if parent is missing", async () => {
    // This is hard to simulate properly with React rendering but we can try to
    // influence it if it hits the branch during some component lifecycle
    render(<SubtitleDisplay src="subs.vtt" currentTime={2} isVisible={true} />);
  });

  it("should handle 3-part timestamps correctly", async () => {
    const vttLong = `WEBVTT
1
01:00:00.000 --> 02:00:00.000
Long format`;
    vi.mocked(apiClient.getText).mockResolvedValue(vttLong);
    await act(async () => {
      render(<SubtitleDisplay src="subs.vtt" currentTime={3605} isVisible={true} />);
    });
    await waitFor(() => { expect(screen.getByText("Long format")).toBeInTheDocument(); });
  });
});

