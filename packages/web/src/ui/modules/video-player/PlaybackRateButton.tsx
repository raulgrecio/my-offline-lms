import React from 'react';

interface PlaybackRateButtonProps {
  playbackRate: number;
  onRateChange: (rate: number) => void;
}

const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default React.memo(function PlaybackRateButton({
  playbackRate,
  onRateChange,
}: PlaybackRateButtonProps) {
  const toggleRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    onRateChange(rates[nextIndex]);
  };

  return (
    <button
      onClick={toggleRate}
      className="p-2 rounded-lg transition-colors hover:bg-white/10 flex items-center justify-center min-w-[38px] text-white select-none group"
      title="Velocidad de reproducción"
      aria-label={`Velocidad de reproducción actual: ${playbackRate}x`}
    >
      <span className="text-xs font-bold leading-none opacity-80 group-hover:opacity-100 transition-opacity">
        {playbackRate}x
      </span>
    </button>
  );
});
