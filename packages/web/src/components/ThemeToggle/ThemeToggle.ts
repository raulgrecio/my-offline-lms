export function initThemeToggle() {
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
