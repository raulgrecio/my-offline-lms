import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Toggle } from "@web/ui/primitives/Toggle";

describe("Toggle", () => {
  it("should render with label", () => {
    render(<Toggle label="Auto Play" />);
    expect(screen.getByText("Auto Play")).toBeDefined();
  });

  it("should handle controlled state changes", () => {
    const onChange = vi.fn();
    render(<Toggle label="Test" checked={false} onChange={onChange} />);
    
    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    fireEvent.click(checkbox);
    
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("should handle defaultChecked (uncontrolled)", () => {
    render(<Toggle label="Test" defaultChecked={true} />);
    
    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it("should use the provided ID", () => {
    render(<Toggle label="Test" id="custom-id" />);
    
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox.getAttribute("id")).toBe("custom-id");
  });

  it("should wrap label with htmlFor pointing to checkbox", () => {
    render(<Toggle label="Test" id="test-id" />);
    
    const label = screen.getByText("Test").closest("label");
    expect(label?.getAttribute("for")).toBe("test-id");
  });
});
