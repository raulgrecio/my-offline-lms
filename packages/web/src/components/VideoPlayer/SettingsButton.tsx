import { Icon } from '../Icon';

export interface SettingsButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function SettingsButton({ isOpen, onToggle }: SettingsButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="p-1.5 rounded-lg transition-all duration-200"
      style={{
        color: isOpen ? '#fff' : 'rgba(255,255,255,0.6)',
        background: isOpen ? 'rgba(255,255,255,0.15)' : 'transparent',
      }}
      title="Configuración de subtítulos"
    >
      <Icon name="settings" size="sm" />
    </button>
  );
}
