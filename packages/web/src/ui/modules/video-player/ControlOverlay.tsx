import { type ReactNode } from 'react';

export interface ControlOverlayProps {
  isVisible: boolean;
  children: ReactNode;
}

export default function ControlOverlay({ isVisible, children }: ControlOverlayProps) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none transition-opacity duration-300 flex flex-col justify-end bg-linear-to-t from-black/40 via-transparent to-transparent ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div 
        className="p-4 sm:p-6 pt-8 sm:pt-12 flex flex-col gap-3 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
