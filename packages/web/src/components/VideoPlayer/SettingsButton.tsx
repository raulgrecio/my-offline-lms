import { Icon } from '../Icon';

export interface SettingsButtonProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function SettingsButton({ isOpen, onToggle }: SettingsButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`p-1.5 rounded-lg transition-colors bg-surface-600 ${isOpen ? 'text-brand-400' : 'text-text-secondary hover:text-text-primary'}`}
      title="Configuración de subtítulos"
    >
      <Icon name="settings" size="sm" />
    </button>
  );
}
