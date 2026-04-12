import React from 'react';
import PlayerButton from './PlayerButton';

export interface PlayPauseButtonProps {
  isPlaying: boolean;
  onToggle: () => void;
}

const PlayPauseButton = React.memo(({ isPlaying, onToggle }: PlayPauseButtonProps) => {
  return (
    <PlayerButton
      icon={isPlaying ? "pause" : "play"}
      className={!isPlaying ? "translate-x-0.5" : ""}
      title={isPlaying ? 'Pausar' : 'Reproducir'}
      isActive={!isPlaying}
      onClick={onToggle}
    />
  );
});

export default PlayPauseButton;
