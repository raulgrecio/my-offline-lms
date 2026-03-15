import React from 'react';
import { icons, iconSizeMap } from './icons';
import type { IconName, IconSize } from './icons';

/**
 * Icon.tsx - A centralized React component for premium SVG icons.
 * Replaces legacy emojis and hardcoded SVGs with a consistent, theme-aware aesthetic.
 * This component is compatible with Astro since it can be used in React islands.
 */
export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: IconSize;
  strokeWidth?: number;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 'md',
  strokeWidth = 2,
  className = '',
  ...props
}) => {
  const iconSize = iconSizeMap[size];
  const paths = icons[name];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${iconSize} ${className}`}
      dangerouslySetInnerHTML={{ __html: paths }}
      {...props}
    />
  );
};

export default Icon;
