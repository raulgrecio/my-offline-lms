export interface PlayPauseButtonProps {
  isPlaying: boolean;
  onToggle: () => void;
}

export default function PlayPauseButton({ isPlaying, onToggle }: PlayPauseButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="text-white p-1 rounded transition-transform hover:scale-110"
      aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
    >
      {isPlaying ? (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
}
