import { cn } from '@web/lib/cn';

import { Icon, type IconName } from '@web/ui/primitives/Icon';
import { Button as UIButton, type PolymorphicButtonProps, type ButtonAs } from '@web/ui/primitives/button/Button';
import type {
  ButtonVariant,
  ButtonSize,
  ButtonType,
  ButtonHoverEffect,
} from "@web/ui/primitives/button/button.types";

export type { ButtonVariant, ButtonSize, ButtonType, ButtonHoverEffect };

export type ButtonProps<T extends ButtonAs = "button"> = PolymorphicButtonProps<T> & {
  icon?: IconName;
  iconRight?: IconName;
  iconClass?: string;
  iconRightClass?: string;
};

export function Button<T extends ButtonAs = "button">({
  size = 'md',
  square = false,
  icon,
  iconRight,
  iconClass = '',
  iconRightClass = '',
  children,
  ...props
}: ButtonProps<T>) {

  const iconBaseStyles = 'shrink-0 transition-all duration-200';

  const iconSizes = {
    xs: 'xs' as const,
    sm: 'sm' as const,
    md: square ? ('md' as const) : ('sm' as const),
    lg: square ? ('lg' as const) : ('md' as const),
    xl: square ? ('xl' as const) : ('md' as const),
  };

  return (
    <UIButton
      size={size}
      square={square}
      {...props as any}
    >
      {icon && (
        <Icon
          name={icon}
          size={iconSizes[size]}
          className={cn(
            iconBaseStyles,
            (children || !!iconRight) && '-ml-1',
            iconClass
          )}
        />
      )}

      {children}

      {iconRight && (
        <Icon
          name={iconRight}
          size={iconSizes[size]}
          className={cn(
            iconBaseStyles,
            (children || !!icon) && '-mr-1',
            iconRightClass
          )}
        />
      )}
    </UIButton>
  );
}
