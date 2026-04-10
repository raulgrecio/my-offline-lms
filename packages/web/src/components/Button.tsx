import React from 'react';
import { Icon, type IconName } from './Icon';
import { cn } from '@web/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'none';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ButtonType = 'button' | 'submit' | 'reset';
export type ButtonHoverEffect = 'none' | 'translate' | 'scale';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  square?: boolean;
  block?: boolean;
  muted?: boolean;
  hoverEffect?: ButtonHoverEffect;
  icon?: IconName;
  iconRight?: IconName;
  iconClass?: string;
  iconRightClass?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  square = false,
  block = false,
  muted = false,
  hoverEffect = 'none',
  className = '',
  icon,
  iconRight,
  iconClass = '',
  iconRightClass = '',
  children,
  ...props
}) => {
  // Base Styles
  const baseStyles =
    'group relative inline-flex items-center justify-center font-semibold transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary';
  const activeStyles = 'active:translate-y-0 active:scale-[0.98]';

  const hoverEffects = {
    none: '',
    translate: 'hover:-translate-y-0.5',
    scale: 'hover:scale-110',
  };

  // Variants
  const variants = {
    primary: 'bg-brand-600 text-white hover:bg-brand-500 shadow-sm shadow-brand-600/10',
    secondary:
      'bg-text-primary text-surface-950 hover:bg-text-primary/80 hover:text-surface-950/80 shadow-sm',
    ghost:
      'bg-transparent text-text-secondary hover:bg-surface-800 hover:text-brand-400',
    outline:
      'bg-transparent text-text-secondary border border-border-subtle hover:bg-surface-800 hover:text-brand-400 hover:border-brand-500/50',
    danger:
      'bg-danger/10 text-danger hover:bg-danger hover:text-white border border-danger/20 hover:border-danger shadow-sm',
    none: '',
  };

  // Icon styles
  const iconBaseStyles = 'shrink-0 transition-all duration-200';

  // Sizes (Padding and Text)
  const sizes = {
    xs: square ? 'w-7 h-7 rounded-md' : 'px-2 py-1 text-2xs rounded-md gap-1',
    sm: square ? 'w-9 h-9 rounded-lg' : 'px-4 py-2 text-xs rounded-lg gap-2',
    md: square ? 'w-11 h-11 rounded-xl' : 'px-5 py-2.5 text-sm rounded-xl gap-2',
    lg: square
      ? 'w-14 h-14 rounded-2xl'
      : 'px-8 py-4 text-base rounded-2xl gap-3',
    xl: square ? 'w-16 h-16 rounded-2xl' : 'px-10 py-5 text-lg rounded-2xl gap-4',
  };

  const iconSizes = {
    xs: 'xs' as const,
    sm: 'sm' as const,
    md: square ? ('md' as const) : ('sm' as const),
    lg: square ? ('lg' as const) : ('md' as const),
    xl: square ? ('xl' as const) : ('md' as const),
  };

  const widthStyle = block ? 'w-full' : '';
  const allProgressClasses = loading
    ? 'relative transition-none pointer-events-none !shadow-none !translate-y-0 !scale-100'
    : '';

  const mutedStyles = muted ? '!text-text-muted hover:!text-inherit' : '';

  const finalClasses = cn(
    variant !== 'none' ? baseStyles + ' ' + activeStyles : '',
    variants[variant],
    hoverEffects[hoverEffect],
    sizes[size],
    widthStyle,
    mutedStyles,
    allProgressClasses,
    className
  );

  return (
    <button
      className={finalClasses}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <div className="loading-spinner absolute inset-0 flex items-center justify-center text-current bg-inherit rounded-[inherit]">
          <div className="animate-spin rounded-full h-5 w-5 border-3 border-current border-t-transparent shadow-sm" />
        </div>
      )}

      <span className={loading ? 'invisible' : 'contents'}>
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
      </span>
    </button>
  );
};
