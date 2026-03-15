import { Icon } from '../Icon';

interface PlayOverlayProps {
  isVisible: boolean;
}

export default function PlayOverlay({ isVisible }: PlayOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-opacity duration-300">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl"
        style={{
          background: 'var(--color-brand-600)',
          backdropFilter: 'blur(8px)',
          color: 'white'
        }}
      >
        <Icon name="play" size="xl" strokeWidth={3} className="translate-x-0.5" fill="currentColor" />
      </div>
    </div>
  );
}
