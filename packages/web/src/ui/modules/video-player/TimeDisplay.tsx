export interface TimeDisplayProps {
  currentTime: number;
  duration: number;
}

export default function TimeDisplay({ currentTime, duration }: TimeDisplayProps) {
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <span className="text-xs tabular-nums text-white">
      {fmt(currentTime)} / {fmt(duration)}
    </span>
  );
}
