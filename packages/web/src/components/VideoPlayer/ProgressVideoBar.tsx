import { VIDEO_SEGMENT_SIZE } from '@features/progress/application/constants';

export interface ProgressVideoBarProps {
  currentTime: number;
  duration: number;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  visitedSegments?: number[];
}

export default function ProgressVideoBar({ currentTime, duration, onSeek, visitedSegments = [] }: ProgressVideoBarProps) {
  const totalSegments = Math.ceil(duration / VIDEO_SEGMENT_SIZE) || 0;
  
  return (
    <div className="relative w-full h-1.5 group/bar flex items-center">
      {/* Visited Segments Layer */}
      <div className="absolute inset-0 flex w-full h-full rounded-full overflow-hidden bg-surface-800/50 pointer-events-none">
        {totalSegments > 0 && Array.from({ length: totalSegments }).map((_, i) => (
          <div 
            key={i}
            className={`h-full flex-1 ${visitedSegments.includes(i) ? 'bg-brand-500/30' : ''}`}
          />
        ))}
      </div>

      {/* Actual Progress Input */}
      <input
        type="range"
        min={0}
        max={duration || 100}
        step={0.1}
        value={currentTime}
        onChange={onSeek}
        className="absolute inset-0 w-full accent-brand-500 h-full cursor-pointer opacity-100 bg-transparent appearance-none [&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent"
        aria-label="Barra de progreso"
      />
    </div>
  );
}
