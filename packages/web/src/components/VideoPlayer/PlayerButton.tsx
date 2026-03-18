import React from 'react';
import { Icon } from '../Icon';
import type { IconName, IconSize } from '../Icon/icons';

export interface PlayerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  iconSize?: IconSize;
  isActive?: boolean;
  iconFill?: string;
  activeColor?: string;
  title: string;
}

const PlayerButton = React.memo(({
  icon,
  iconSize = 'sm',
  isActive = false,
  iconFill = 'none',
  activeColor = "text-white hover:text-white",
  title,
  className = '',
  ...props
}: PlayerButtonProps) => {
  const baseStyles = "p-2 rounded-lg transition-colors hover:bg-white/10 flex items-center justify-center";
  const activeStyles = isActive ? activeColor : "text-white hover:text-white";
  
  return (
    <button
      className={`${baseStyles} ${activeStyles} ${className}`}
      title={title}
      aria-label={title}
      {...props}
    >
      <Icon name={icon} size={iconSize} fill={iconFill} />
    </button>
  );
});

export default PlayerButton;
