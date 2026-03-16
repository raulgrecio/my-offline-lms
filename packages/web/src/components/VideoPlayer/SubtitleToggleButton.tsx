import { Icon } from '../Icon';

export interface SubtitleToggleButtonProps {
  isVisible: boolean;
  onToggle: () => void;
}

export default function SubtitleToggleButton({ isVisible, onToggle }: SubtitleToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`p-1.5 rounded-lg transition-colors bg-surface-600 ${isVisible ? 'text-brand-400' : 'text-text-secondary hover:text-text-primary'}`}
      title={isVisible ? 'Desactivar subtítulos' : 'Activar subtítulos'}
    >
      <Icon name="subtitles" size="sm" />
    </button>
  );
}
