
import { describe, it, expect, beforeEach } from "vitest";
import { initThemeToggle } from "@components/ThemeToggle/ThemeToggle";

describe("ThemeToggle Logic", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.body.innerHTML = `
      <button data-theme-toggle aria-label="Cambiar tema">
        <div class="icon-sun"></div>
        <div class="icon-moon"></div>
      </button>
    `;
  });

  it("should toggle theme correctly", () => {
    initThemeToggle();
    const button = document.querySelector("[data-theme-toggle]") as HTMLElement;

    // Default: no theme
    expect(document.documentElement.getAttribute("data-theme")).toBeNull();

    // Toggle to dark
    button.click();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");

    // Toggle to light
    button.click();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
