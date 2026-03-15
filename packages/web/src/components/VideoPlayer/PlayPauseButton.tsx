import { Icon } from '../Icon';

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
        <Icon name="pause" size="sm" fill="currentColor" />
      ) : (
        <Icon name="play" size="sm" fill="currentColor" />
      )}
    </button>
  );
}
