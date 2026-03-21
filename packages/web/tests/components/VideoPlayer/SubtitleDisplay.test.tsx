import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import SubtitleDisplay from "@components/VideoPlayer/SubtitleDisplay";
import { apiClient } from "@platform/api/client";

// Mock apiClient
vi.mock("@platform/api/client", () => ({
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

describe("SubtitleDisplay Component", () => {
  beforeEach(() => {
    vi.mocked(apiClient.getText).mockResolvedValue(mockVtt);
    localStorage.clear();
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
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<SubtitleDisplay src="subs.vtt" currentTime={2} isVisible={true} />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching subtitles:', expect.any(Error));
    });
    consoleSpy.mockRestore();
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
        x: 0, y: 0, toJSON: () => {}
    });
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({
        width: 200, height: 50, top: 0, left: 0, bottom: 50, right: 200,
        x: 0, y: 0, toJSON: () => {}
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
});

