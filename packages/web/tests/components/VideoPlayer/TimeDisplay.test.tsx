import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import TimeDisplay from "@web/components/VideoPlayer/TimeDisplay";

describe("TimeDisplay Component", () => {
  it("should format time 0 / 0 correctly", () => {
    render(<TimeDisplay currentTime={0} duration={0} />);
    expect(screen.getByText("0:00 / 0:00")).toBeInTheDocument();
  });

  it("should format double digit minutes correctly", () => {
    // 72s = 1:12
    // 3600s = 60:00
    render(<TimeDisplay currentTime={72} duration={3661} />);
    expect(screen.getByText("1:12 / 61:01")).toBeInTheDocument();
  });

  it("should format small durations", () => {
    render(<TimeDisplay currentTime={8} duration={15} />);
    expect(screen.getByText("0:08 / 0:15")).toBeInTheDocument();
  });
});
