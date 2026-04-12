import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Icon } from "@web/ui/primitives/Icon";

describe("Icon Component", () => {
  it("should render correctly with a given name", () => {
    const { container } = render(<Icon name="home" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("w-5 h-5"); // default size md
  });

  it("should apply correct size class", () => {
    const { container } = render(<Icon name="settings" size="lg" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("w-6 h-6");
  });

  it("should apply custom strokeWidth", () => {
    const { container } = render(<Icon name="play" strokeWidth={3} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("stroke-width", "3");
  });

  it("should pass additional props to svg", () => {
    render(<Icon name="pause" data-testid="custom-icon" />);
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("should include svg paths for the given icon name", () => {
    const { container } = render(<Icon name="check" />);
    const svg = container.querySelector("svg");
    // Check that it contains something in dangerouslySetInnerHTML
    expect(svg?.innerHTML).toContain("polyline");
  });
});
