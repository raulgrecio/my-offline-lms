import { Icon } from '../Icon';

export interface SubtitleToggleButtonProps {
  isVisible: boolean;
  onToggle: () => void;
}

export default function SubtitleToggleButton({ isVisible, onToggle }: SubtitleToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="p-1.5 rounded-lg transition-all duration-200"
      style={{
        color: isVisible ? '#fff' : 'rgba(255,255,255,0.3)',
        background: isVisible ? 'rgba(255,255,255,0.15)' : 'transparent',
        boxShadow: isVisible ? '0 0 5px rgba(255,255,255,0.1)' : 'none'
      }}
      title={isVisible ? 'Desactivar subtítulos' : 'Activar subtítulos'}
    >
      <Icon name="subtitles" size="sm" />
    </button>
  );
}
