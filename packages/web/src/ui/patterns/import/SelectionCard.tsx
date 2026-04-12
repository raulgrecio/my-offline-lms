import React from 'react';
import { Icon, type IconName } from '@web/ui/primitives/Icon';

import type { UITheme } from './category-themes';

interface SelectionCardProps {
  icon: IconName;
  title: string;
  description: string;
  isActive: boolean;
  theme: UITheme;
  children?: React.ReactNode;
}

export const SelectionCard: React.FC<SelectionCardProps> = ({
  icon,
  title,
  description,
  isActive,
  theme,
  children
}) => {
  return (
    <div className={`p-8 bg-surface-800 rounded-3xl border flex flex-col group transition-all duration-500 ${isActive ? `${theme.activeBorder} ring-1 ${theme.ring} ${theme.activeShadow} bg-surface-800/80` : 'border-border-subtle hover:border-border-default hover:bg-surface-900/40 shadow-sm'
      }`}>
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0 ${isActive ? `${theme.activeBg} text-white shadow-lg ${theme.activeShadow}` : 'bg-surface-900 text-text-muted'
          }`}>
          <Icon name={icon} size="md" />
        </div>
        <h3 className="text-lg font-bold text-text-primary">
          {title}
        </h3>
      </div>

      <p className="text-xs text-text-muted mb-6 leading-relaxed">
        {description}
      </p>

      {children}
    </div>
  );
};
