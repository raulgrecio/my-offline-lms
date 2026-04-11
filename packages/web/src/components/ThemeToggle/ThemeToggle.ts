export function applyTheme() {
  const saved = localStorage.getItem("theme");
  const theme = saved || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  document.documentElement.setAttribute("data-theme", theme);
}

export function initThemeToggle() {
  applyTheme();
  const btns = document.querySelectorAll("[data-theme-toggle]");
  const doc = document.documentElement;

  btns.forEach((btn) => {
    (btn as HTMLElement).onclick = () => {
      const next = doc.getAttribute("data-theme") === "dark" ? "light" : "dark";
      doc.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
    };
  });
}
