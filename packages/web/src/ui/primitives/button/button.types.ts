export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "danger"
  | "none";

export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

export type ButtonType = "button" | "submit" | "reset";

export type ButtonHoverEffect = "none" | "translate" | "scale";

export interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  square?: boolean;
  block?: boolean;
  muted?: boolean;
  hoverEffect?: ButtonHoverEffect;
  className?: string;
}