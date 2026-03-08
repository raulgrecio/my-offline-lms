import { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  assetId: string;
  src: string;
  title: string;
  subtitleSrc?: string;
  initialPosition?: number;
}

export default function VideoPlayer({ assetId, src, title, subtitleSrc, initialPosition = 0 }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Set initial position
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onMeta = () => {
      if (initialPosition > 0) {
        video.currentTime = initialPosition;
      }
    };
    video.addEventListener('loadedmetadata', onMeta);
    return () => video.removeEventListener('loadedmetadata', onMeta);
  }, [initialPosition]);

  // Save progress every 5 seconds
  useEffect(() => {
    saveTimer.current = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        saveProgress(videoRef.current.currentTime, false);
      }
    }, 5000);
    return () => { if (saveTimer.current) clearInterval(saveTimer.current); };
  }, [assetId]);

  const saveProgress = useCallback(async (position: number, completed: boolean) => {
    try {
      await fetch('/api/progress/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, positionSec: position, completed }),
      });
    } catch { /* silent */ }
  }, [assetId]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setIsPlaying(true); }
    else { v.pause(); setIsPlaying(false); }
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    saveProgress(duration, true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Number(e.target.value);
    setCurrentTime(Number(e.target.value));
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = Number(e.target.value);
    setVolume(Number(e.target.value));
  };

  const showControlsTemp = () => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="relative rounded-xl overflow-hidden group"
      style={{ background: '#000', aspectRatio: '16/9', maxHeight: '70vh' }}
      onMouseMove={showControlsTemp}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration)}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        {subtitleSrc && <track kind="subtitles" src={subtitleSrc} label="Subtítulos" default />}
      </video>

      {/* Big play overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(199,70,52,0.85)', backdropFilter: 'blur(4px)' }}
          >
            <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7 ml-1">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className="absolute bottom-0 left-0 right-0 transition-opacity duration-300"
        style={{
          opacity: showControls || !isPlaying ? 1 : 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
          padding: '1rem 1rem 0.75rem',
          pointerEvents: showControls || !isPlaying ? 'auto' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div className="text-xs font-medium mb-2 truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>
          {title}
        </div>

        {/* Seek bar */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.5}
          value={currentTime}
          onChange={handleSeek}
          className="w-full mb-2"
          style={{ accentColor: '#c74634', height: '3px', cursor: 'pointer' }}
        />

        {/* Bottom row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Play/pause */}
            <button
              onClick={togglePlay}
              className="text-white p-1 rounded transition-transform hover:scale-110"
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Volume */}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={handleVolume}
              className="w-16 sm:w-24"
              style={{ accentColor: '#c74634', height: '3px', cursor: 'pointer' }}
              aria-label="Volumen"
            />

            {/* Time */}
            <span className="text-xs tabular-nums" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {fmt(currentTime)} / {fmt(duration)}
            </span>
          </div>

          {/* Fullscreen */}
          <button
            onClick={() => videoRef.current?.requestFullscreen?.()}
            className="text-white p-1 rounded transition-transform hover:scale-110"
            aria-label="Pantalla completa"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
