import { Icon } from '../Icon';

export interface FullscreenButtonProps {
  isFullscreen: boolean;
  onToggle: () => void;
}

export default function FullscreenButton({ isFullscreen, onToggle }: FullscreenButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="text-white p-1.5 rounded-lg transition-transform hover:scale-110 opacity-70 hover:opacity-100"
      aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
    >
      <Icon name={isFullscreen ? "minimize" : "maximize"} size="sm" />
    </button>
  );
}
