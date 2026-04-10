import React, { useEffect } from 'react';
import { Icon } from './Icon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md'
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative w-full ${maxWidth} bg-surface-900 border border-border-subtle rounded-3xl shadow-2xl animate-in zoom-in slide-in-from-bottom-4 duration-300 overflow-hidden`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-subtle">
          <h3 className="text-lg font-bold text-text-primary tracking-tight">
            {title || 'Modal'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface-800 text-text-muted transition-colors"
          >
            <Icon name="x" size="sm" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};
