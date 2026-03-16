import { Icon } from '../Icon';

export interface VolumeControlProps {
  volume: number;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function VolumeControl({ volume, onVolumeChange }: VolumeControlProps) {
  return (
    <div className="flex items-center gap-2 group">
      <div className="text-text-secondary opacity-70 group-hover:opacity-100 transition-opacity">
        <Icon name={volume === 0 ? "volume-x" : "volume-2"} size="sm" />
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={onVolumeChange}
        className="w-16 sm:w-24 accent-brand-600 h-[3px] cursor-pointer"
        aria-label="Volumen"
      />
    </div>
  );
}
