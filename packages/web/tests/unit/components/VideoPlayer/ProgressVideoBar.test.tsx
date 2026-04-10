import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ProgressVideoBar from "@web/components/VideoPlayer/ProgressVideoBar";
import { VIDEO_SEGMENT_SIZE } from "@web/features/progress/application/constants";

describe("ProgressVideoBar", () => {
  const defaultProps = {
    currentTime: 50,
    duration: 100,
    onSeek: () => {},
    visitedSegments: [0, 1, 2], // First 3 segments
  };

  it("should render the segments container", () => {
    const { container } = render(<ProgressVideoBar {...defaultProps} />);
    const segmentsContainer = container.querySelector(".absolute.inset-0.flex");
    expect(segmentsContainer).toBeTruthy();
  });

  it("should render the correct number of segment blocks", () => {
    // duration 100
    const { container } = render(<ProgressVideoBar {...defaultProps} />);
    const segments = container.querySelectorAll(".absolute.inset-0.flex > div");
    const expectedSegments = Math.ceil(defaultProps.duration / VIDEO_SEGMENT_SIZE);
    expect(segments.length).toBe(expectedSegments);
  });

  it("should apply the visited class to segments in visitedSegments", () => {
    const { container } = render(<ProgressVideoBar {...defaultProps} />);
    const segments = container.querySelectorAll(".absolute.inset-0.flex > div");
    
    // First 3 segments should have bg-brand-500/30
    expect(segments[0].className).toContain("bg-brand-500/30");
    expect(segments[1].className).toContain("bg-brand-500/30");
    expect(segments[2].className).toContain("bg-brand-500/30");
    
    // 4th segment should not
    expect(segments[3].className).not.toContain("bg-brand-500/30");
  });

  it("should handle empty visitedSegments", () => {
    const { container } = render(<ProgressVideoBar {...defaultProps} visitedSegments={[]} />);
    const segments = container.querySelectorAll(".absolute.inset-0.flex > div");
    const visitedSegmentsCount = Array.from(segments).filter(s => s.className.includes("bg-brand-500/30")).length;
    expect(visitedSegmentsCount).toBe(0);
  });
});
