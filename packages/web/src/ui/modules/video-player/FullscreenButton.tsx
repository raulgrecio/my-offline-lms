import React from 'react';
import PlayerButton from './PlayerButton';

export interface FullscreenButtonProps {
  isFullscreen: boolean;
  onToggle: () => void;
}

const FullscreenButton = React.memo(({ isFullscreen, onToggle }: FullscreenButtonProps) => {
  return (
    <PlayerButton
      icon={isFullscreen ? "minimize" : "maximize"}
      title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
      onClick={onToggle}
    />
  );
});

export default FullscreenButton;
