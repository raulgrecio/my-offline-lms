import React from 'react';
import PlayerButton from './PlayerButton';

export interface SubtitleToggleButtonProps {
  isVisible: boolean;
  onToggle: () => void;
}

const SubtitleToggleButton = React.memo(({ isVisible, onToggle }: SubtitleToggleButtonProps) => {
  return (
    <PlayerButton
      icon="subtitles"
      title={isVisible ? 'Desactivar subtítulos' : 'Activar subtítulos'}
      isActive={isVisible}
      onClick={onToggle}
    />
  );
});

export default SubtitleToggleButton;
