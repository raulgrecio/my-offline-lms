export interface FullscreenButtonProps {
  onToggle: () => void;
}

export default function FullscreenButton({ onToggle }: FullscreenButtonProps) {
  return (
    <button
      onClick={onToggle}
      className="text-white p-1.5 rounded-lg transition-transform hover:scale-110 opacity-70 hover:opacity-100"
      aria-label="Pantalla completa"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
      </svg>
    </button>
  );
}
