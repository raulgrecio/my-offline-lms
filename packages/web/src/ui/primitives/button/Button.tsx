import React from "react";
import { getButtonClasses, getSpinnerClasses } from "./button.styles";
import type { ButtonStyleProps } from "./button.types";

export type ButtonAs = "button" | "a";

export interface ButtonProps extends ButtonStyleProps {
  as?: ButtonAs;
  children?: React.ReactNode;
}

// Discriminated type for polymorphic props
export type PolymorphicButtonProps<T extends ButtonAs> = ButtonProps &
  (T extends "a"
    ? React.AnchorHTMLAttributes<HTMLAnchorElement>
    : React.ButtonHTMLAttributes<HTMLButtonElement>);

// Generic Button component supporting both <button> and <a>
export function Button<T extends ButtonAs = "button">({
  as,
  type = "button",
  disabled = false,
  loading = false,
  children,
  className = "",
  ...rest
}: PolymorphicButtonProps<T>) {
  const classes = getButtonClasses({
    ...rest,
    loading,
    className,
  });

  // Determine the tag based on "as" prop or presence of "href"
  const href = "href" in rest ? (rest as any).href : undefined;
  const Tag = (as || (href ? "a" : "button")) as React.ElementType;
  const isButton = Tag === "button";

  return (
    <Tag
      type={isButton ? type : undefined}
      disabled={isButton ? disabled || loading : undefined}
      aria-busy={loading}
      className={classes}
      {...rest}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={getSpinnerClasses(rest.size)} />
        </div>
      )}

      <span className={loading ? "invisible" : "contents"}>
        {children}
      </span>
    </Tag>
  );
}