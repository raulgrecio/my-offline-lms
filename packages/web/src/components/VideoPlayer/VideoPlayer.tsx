import { useState, useRef, useEffect, useCallback } from 'react';

import SubtitleDisplay from './SubtitleDisplay';
import PlayerSettings, { type SubtitleMode } from './PlayerSettings';
import PlayOverlay from './PlayOverlay';
import VideoTitle from './VideoTitle';
import ProgressVideoBar from './ProgressVideoBar';
import PlayPauseButton from './PlayPauseButton';
import VolumeControl from './VolumeControl';
import TimeDisplay from './TimeDisplay';
import FullscreenButton from './FullscreenButton';
import SubtitleToggleButton from './SubtitleToggleButton';
import SettingsButton from './SettingsButton';
import ControlOverlay from './ControlOverlay';

interface Props {
  assetId: string;
  src: string;
  title: string;
  subtitleSrc?: string;
  initialPosition?: number;
  initialDuration?: number | string;
}

export default function VideoPlayer({ assetId, src, title, subtitleSrc, initialPosition = 0, initialDuration = 0 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [duration, setDuration] = useState(Number(initialDuration) || 0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>('custom');
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load preferences
  useEffect(() => {
    const savedMode = localStorage.getItem('subtitle_mode') as SubtitleMode;
    if (savedMode === 'custom' || savedMode === 'native') {
      setSubtitleMode(savedMode);
    }
  }, []);

  const changeSubtitleMode = (mode: SubtitleMode) => {
    setSubtitleMode(mode);
    localStorage.setItem('subtitle_mode', mode);
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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



  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden group w-full video-player-container bg-surface-950 aspect-video max-h-[70vh]"
      onMouseMove={showControlsTemp}
      onClick={() => {
        togglePlay();
        if (showSettings) setShowSettings(false);
      }}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        {subtitleMode === 'native' && subtitleSrc && showSubtitles && (
          <track kind="subtitles" src={subtitleSrc} label="Subtítulos" default />
        )}
      </video>

      {subtitleMode === 'custom' && subtitleSrc && (
        <SubtitleDisplay
          src={subtitleSrc}
          currentTime={currentTime}
          isVisible={showSubtitles}
        />
      )}

      {/* Big play overlay */}
      <PlayOverlay isVisible={!isPlaying} />

      <VideoTitle
        title={title}
        isVisible={!isPlaying || showControls}
      />

      {/* Controls overlay */}
      <ControlOverlay isVisible={showControls || !isPlaying}>
        {/* Settings Popup */}
        {showSettings && (
          <PlayerSettings
            subtitleMode={subtitleMode}
            onChangeSubtitleMode={changeSubtitleMode}
          />
        )}

        {/* Seek bar */}
        <ProgressVideoBar
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
        />

        {/* Bottom row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Play/pause */}
            <PlayPauseButton
              isPlaying={isPlaying}
              onToggle={togglePlay}
            />

            {/* Volume */}
            <VolumeControl
              volume={volume}
              onVolumeChange={handleVolume}
            />

            {/* Time */}
            <TimeDisplay
              currentTime={currentTime}
              duration={duration}
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Subtitles Toggle (CC) */}
            {subtitleSrc && (
              <SubtitleToggleButton
                isVisible={showSubtitles}
                onToggle={() => setShowSubtitles(!showSubtitles)}
              />
            )}

            {/* Subtitle Settings (Gear) */}
            {subtitleSrc && (
              <SettingsButton
                isOpen={showSettings}
                onToggle={() => setShowSettings(!showSettings)}
              />
            )}

            {/* Fullscreen */}
            <FullscreenButton
              isFullscreen={isFullscreen}
              onToggle={() => {
                const c = containerRef.current;
                if (!c) return;
                if (document.fullscreenElement) {
                  document.exitFullscreen();
                } else {
                  c.requestFullscreen?.();
                }
                if (showSettings) setShowSettings(false);
              }}
            />
          </div>
        </div>
      </ControlOverlay>
    </div>
  );
}
