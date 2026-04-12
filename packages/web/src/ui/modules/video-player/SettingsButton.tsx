import React from 'react';
import PlayerButton from './PlayerButton';

export interface SettingsButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

const SettingsButton = React.memo(({ isOpen, onToggle }: SettingsButtonProps) => {
  return (
    <PlayerButton
      icon="settings"
      title="Configuración de subtítulos"
      isActive={isOpen}
      onClick={onToggle}
      activeColor="text-brand-400 bg-white/5"
    />
  );
});

export default SettingsButton;
