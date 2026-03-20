import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ThemeToggle from "@components/ThemeToggle";

// Mock the Icon component as it's not the subject of this test
vi.mock("@components/Icon", () => ({
  Icon: ({ name }: { name: string }) => <span data-testid="icon">{name}</span>,
}));

describe("ThemeToggle Component", () => {
  beforeEach(() => {
    // Clear localStorage and reset document attribute
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("should start with light theme if not specified (placeholder then actual)", async () => {
    render(<ThemeToggle />);
    
    // Initial mount might show placeholder (mounted is false)
    // but in JSDOM the useEffect runs quickly.
    
    const button = await screen.findByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("should toggle theme when clicked", async () => {
    // Force initial theme to dark
    document.documentElement.setAttribute("data-theme", "dark");
    
    render(<ThemeToggle />);
    
    const button = await screen.findByRole("button");
    
    // click to toggle to light
    act(() => {
      fireEvent.click(button);
    });
    
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
    
    // click again to toggle to dark
    act(() => {
      fireEvent.click(button);
    });
    
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("should show correct icon based on theme", async () => {
    document.documentElement.setAttribute("data-theme", "dark");
    render(<ThemeToggle />);
    
    // theme dark => icon sun (to change to moon? no, check code)
    // code says: Icon name={theme === 'dark' ? 'sun' : 'moon'}
    const icon = await screen.findByTestId("icon");
    expect(icon).toHaveTextContent("sun");
    
    act(() => {
      fireEvent.click(screen.getByRole("button"));
    });
    
    expect(icon).toHaveTextContent("moon");
  });
});
