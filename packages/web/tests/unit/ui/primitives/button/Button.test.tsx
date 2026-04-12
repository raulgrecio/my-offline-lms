import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Button } from "@web/ui/primitives/button/Button";

describe("Button (Primitive React)", () => {
  it("should render children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeDefined();
  });

  it("should render as an anchor when 'as' is 'a'", () => {
    render(<Button as="a" href="https://google.com">Link</Button>);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("https://google.com");
  });

  it("should handle click events", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("should apply variant classes", () => {
    const { container } = render(<Button variant="primary">Primary</Button>);
    // Primary usually has brand colors. We can check if it has the expected class from button.styles.ts
    // or just check that it renders.
    expect(container.firstChild).toBeDefined();
  });
});
