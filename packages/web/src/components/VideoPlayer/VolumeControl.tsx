export interface VolumeControlProps {
  volume: number;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function VolumeControl({ volume, onVolumeChange }: VolumeControlProps) {
  return (
    <input
      type="range"
      min={0}
      max={1}
      step={0.05}
      value={volume}
      onChange={onVolumeChange}
      className="w-16 sm:w-24"
      style={{ 
        accentColor: '#c74634', 
        height: '3px', 
        cursor: 'pointer' 
      }}
      aria-label="Volumen"
    />
  );
}
