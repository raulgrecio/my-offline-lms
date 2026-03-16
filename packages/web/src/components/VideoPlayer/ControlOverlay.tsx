import { type ReactNode } from 'react';

export interface ControlOverlayProps {
  isVisible: boolean;
  children: ReactNode;
}

export default function ControlOverlay({ isVisible, children }: ControlOverlayProps) {
  return (
    <div
      className={`absolute bottom-0 left-0 right-0 p-4 transition-opacity duration-300 flex flex-col gap-3 bg-glass-bg backdrop-blur-md border-t border-glass-border ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
