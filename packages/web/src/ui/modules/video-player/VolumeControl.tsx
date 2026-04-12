import React from 'react';
import { Icon } from '@web/ui/primitives/Icon';

export interface VolumeControlProps {
  volume: number;
  onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const VolumeControl = React.memo(({ volume, onVolumeChange }: VolumeControlProps) => {
  return (
    <div className="flex items-center gap-2 group">
      <div className="text-white">
        <Icon name={volume === 0 ? "volume-x" : "volume-2"} size="sm" />
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={onVolumeChange}
        className="w-16 sm:w-24 accent-white h-[3px] cursor-pointer rounded-full appearance-none bg-white/50"
        aria-label="Volumen"
      />
    </div>
  );
});

export default VolumeControl;
