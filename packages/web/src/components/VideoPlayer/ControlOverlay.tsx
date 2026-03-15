import { type ReactNode } from 'react';

export interface ControlOverlayProps {
  isVisible: boolean;
  children: ReactNode;
}

export default function ControlOverlay({ isVisible, children }: ControlOverlayProps) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 transition-opacity duration-300"
      style={{
        opacity: isVisible ? 1 : 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
        padding: '1rem 1rem 0.75rem',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
