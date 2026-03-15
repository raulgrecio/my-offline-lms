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
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5V10h-2v4h2v-1H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5V10h-2v4h2v-1H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z" />
      </svg>
    </button>
  );
}
