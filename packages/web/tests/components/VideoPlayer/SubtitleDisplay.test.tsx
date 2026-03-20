import { render, screen, act, waitFor } from "@testing-library/react";
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
});
