export interface ProgressVideoBarProps {
  currentTime: number;
  duration: number;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ProgressVideoBar({ currentTime, duration, onSeek }: ProgressVideoBarProps) {
  return (
    <input
      type="range"
      min={0}
      max={duration || 100}
      step={0.5}
      value={currentTime}
      onChange={onSeek}
      className="w-full accent-brand-600 h-1 cursor-pointer"
      aria-label="Barra de progreso"
    />
  );
}
