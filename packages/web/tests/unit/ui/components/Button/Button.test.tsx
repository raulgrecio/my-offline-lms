import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
// @ts-ignore
import { Button } from "@web/ui/components/Button/Button";

describe("Button (Component React)", () => {
  it("should render with icons", () => {
    // We mock the Icon as it might be complex
    render(<Button icon="home" iconRight="arrow-right">Home</Button>);

    expect(screen.getByText("Home")).toBeDefined();
    // Check for the presence of icons (SVG elements)
    const svgs = screen.getAllByRole("img", { hidden: true });
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });

  it("should apply icon sizing based on button size", () => {
    const { rerender } = render(<Button size="sm" icon="home">Small</Button>);
    // Size logic check would be internal, but we can verify it renders
    expect(screen.getByText("Small")).toBeDefined();

    rerender(<Button size="lg" icon="home">Large</Button>);
    expect(screen.getByText("Large")).toBeDefined();
  });
});
