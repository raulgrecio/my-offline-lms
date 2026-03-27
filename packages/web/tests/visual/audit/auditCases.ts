export interface CaseVariant {
  name: string;
  url: string;
  legacy: {
    tag?: string;
    classes?: string;
    innerHTML?: string;
  };
}

export interface AuditCase {
  componentName: string;
  selector: string;
  states?: ("normal" | "hover" | "active")[];
  cases: CaseVariant[];
}

export const LEGACY_CSS = `
  .legacy-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.55rem 1rem;
    background-color: transparent;
    cursor: pointer;
    text-decoration: none;
    line-height: 1.2;
    border: 1px solid transparent;
    font-family: inherit;
    font-size: 0.875rem;
    color: #a0aec0; /* text-secondary */
  }
  .legacy-btn:hover {
    color: #f0f2f7; /* text-primary */
    border-color: #c74634; /* brand-600 */
    background-color: rgba(199, 70, 52, 0.08); /* brand-600 @ 8% */
  }
  .legacy-btn:active {
    transform: scale(0.98);
  }
  .legacy-btn-secondary {
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0,0,0,0.1);
  }
  .legacy-btn-secondary:hover {
    background: #161b27;
    color: #ff6751;
    border-color: rgba(255, 103, 81, 0.3);
  }
  .legacy-btn-secondary:active {
    background: #1e2535;
    transform: scale(0.95);
  }
`;

const LEGACY_EYE_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const LEGACY_EYE_OFF_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

const LEGACY_CLASSES = "legacy-btn legacy-btn-ghost";

export const CASES: AuditCase[] = [
  {
    componentName: "VisibilityToggle",
    selector: "[data-visibility-toggle]",
    states: ["normal", "hover", "active"],
    cases: [
      {
        name: "ver_todos",
        // In the app: ?all=false makes the button say "Ver todos"
        url: "/courses?all=false",
        legacy: {
          tag: "button",
          classes: LEGACY_CLASSES,
          innerHTML: `${LEGACY_EYE_SVG}<span>Ver todos</span>`
        }
      },
      {
        name: "ocultar_vacios",
        // In the app: ?all=true (or default) makes the button say "Ocultar vacíos"
        url: "/courses?all=true",
        legacy: {
          tag: "button",
          classes: LEGACY_CLASSES,
          innerHTML: `${LEGACY_EYE_OFF_SVG}<span>Ocultar vacíos</span>`
        }
      }
    ]
  }
];
