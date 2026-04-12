import { cn } from "@web/lib/cn";
import type {
  ButtonVariant,
  ButtonSize,
  ButtonHoverEffect,
  ButtonStyleProps,
} from "./button.types";

const baseStyles =
  "group relative inline-flex items-center justify-center font-semibold transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary";

const activeStyles = "active:translate-y-0 active:scale-[0.98]";

const defaultSize: ButtonSize = "md" as const;

const hoverEffects: Record<ButtonHoverEffect, string> = {
  none: "",
  translate: "hover:-translate-y-0.5",
  scale: "hover:scale-110",
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-500 shadow-sm shadow-brand-600/10",
  secondary:
    "bg-text-primary text-surface-950 hover:bg-text-primary/80 hover:text-surface-950/80 shadow-sm",
  ghost:
    "bg-transparent text-text-secondary hover:bg-surface-800 hover:text-brand-400",
  outline:
    "bg-transparent text-text-secondary border border-border-subtle hover:bg-surface-800 hover:text-brand-400 hover:border-brand-500/50",
  danger:
    "bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20 hover:border-danger shadow-sm",
  none: "",
};

function getSizes(size: ButtonSize, square: boolean) {
  const sizes = {
    xs: square ? "w-7 h-7 rounded-md" : "px-2 py-1 text-2xs rounded-md gap-1",
    sm: square ? "w-9 h-9 rounded-lg" : "px-4 py-2 text-xs rounded-lg gap-2",
    md: square ? "w-11 h-11 rounded-xl" : "px-5 py-2.5 text-sm rounded-xl gap-2",
    lg: square ? "w-14 h-14 rounded-2xl" : "px-8 py-4 text-base rounded-2xl gap-3",
    xl: square ? "w-16 h-16 rounded-2xl" : "px-10 py-5 text-lg rounded-2xl gap-4",
  };

  return sizes[size];
}

export function getSpinnerClasses(size: ButtonSize = defaultSize): string {
  const sizes = {
    xs: "h-3 w-3 border-2",
    sm: "h-4 w-4 border-2",
    md: "h-5 w-5 border-2",
    lg: "h-6 w-6 border-3",
    xl: "h-7 w-7 border-3",
  };

  return cn(
    "animate-spin rounded-full border-current border-t-transparent",
    sizes[size]
  );
}

export function getButtonClasses(props: ButtonStyleProps): string {
  const {
    variant = "primary",
    size = defaultSize,
    loading = false,
    square = false,
    block = false,
    muted = false,
    hoverEffect = "none",
    className = "",
  } = props;

  const widthStyle = block ? "w-full" : "";

  const loadingStyles = loading
    ? "relative transition-none pointer-events-none !shadow-none !translate-y-0 !scale-100"
    : "";

  const mutedStyles = muted
    ? "!text-text-muted hover:!text-inherit"
    : "";

  return cn(
    variant !== "none" ? baseStyles + " " + activeStyles : "",
    variants[variant],
    hoverEffects[hoverEffect],
    getSizes(size, square),
    widthStyle,
    mutedStyles,
    loadingStyles,
    className
  );
}