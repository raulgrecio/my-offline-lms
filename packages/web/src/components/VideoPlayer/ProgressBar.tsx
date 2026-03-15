export interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ProgressBar({ currentTime, duration, onSeek }: ProgressBarProps) {
  return (
    <input
      type="range"
      min={0}
      max={duration || 100}
      step={0.5}
      value={currentTime}
      onChange={onSeek}
      className="w-full mb-2"
      style={{ 
        accentColor: 'var(--color-oracle-600)', 
        height: '3px', 
        cursor: 'pointer' 
      }}
      aria-label="Barra de progreso"
    />
  );
}
