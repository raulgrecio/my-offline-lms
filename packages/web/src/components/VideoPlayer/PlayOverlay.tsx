interface PlayOverlayProps {
  isVisible: boolean;
}

export default function PlayOverlay({ isVisible }: PlayOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(199,70,52,0.85)', backdropFilter: 'blur(4px)' }}
      >
        <svg viewBox="0 0 24 24" fill="white" className="w-10 h-10 translate-x-0.5">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
}
