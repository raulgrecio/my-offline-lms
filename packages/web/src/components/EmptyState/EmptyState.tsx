import React from 'react';

import { Icon, type IconName } from '../Icon';
import type { EmptyVariant } from './EmptyVariant';

interface EmptyStateProps {
  title?: string;
  message: string;
  icon?: IconName;
  variant?: EmptyVariant;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon = 'inbox',
  variant = 'empty',
  children
}) => {
  const isLoader = variant === 'loading';

  return (
    <div className={`text-center py-20 rounded-2xl ${variant === 'empty'
      ? 'bg-surface-900 border border-dashed border-border-subtle'
      : 'bg-transparent border border-dashed border-transparent'
      }`}>
      <div className="flex justify-center mb-4">
        {isLoader ? (
          <div className="w-16 h-16 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center text-text-muted">
            <Icon name={icon} size="xl" />
          </div>
        )}
      </div>

      {title && <h2 className="text-lg font-medium text-text-primary mb-2">{title}</h2>}
      <p className="font-medium text-text-secondary">
        {message}
      </p>

      {children && (
        <div className="mt-6 flex justify-center">
          {children}
        </div>
      )}
    </div>
  );
};
