import { useCallback, useEffect, useRef, useState } from 'react';

import { apiClient } from '@web/platform/api/client';
import { API_ROUTES } from '@web/platform/api/routes';
import { VIDEO_SEGMENT_SIZE } from '@web/features/progress/application/constants';
import ControlOverlay from './ControlOverlay';
import FullscreenButton from './FullscreenButton';
import PlayerSettings, { type SubtitleMode } from './PlayerSettings';
import PlayOverlay from './PlayOverlay';
import PlayPauseButton from './PlayPauseButton';
import ProgressVideoBar from './ProgressVideoBar';
import SettingsButton from './SettingsButton';
import SubtitleDisplay from './SubtitleDisplay';
import SubtitleToggleButton from './SubtitleToggleButton';
import TimeDisplay from './TimeDisplay';
import VideoTitle from './VideoTitle';
import VolumeControl from './VolumeControl';
import PlaybackRateButton from './PlaybackRateButton';

export interface VideoPlayerProps {
  src: string;
  title: string;
  subtitleSrc?: string;
  initialTime?: number;
  initialDuration?: number;
  assetId: string;
  courseId: string;
  progressUrl: string;
  autoPlay?: boolean;
}

export default function VideoPlayer({
  src,
  title,
  subtitleSrc,
  initialTime = 0,
  initialDuration = 0,
  assetId,
  courseId,
  progressUrl,
  autoPlay = false
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const initialTimeSet = useRef(false);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(initialDuration);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>('custom');
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [subtitleOpacity, setSubtitleOpacity] = useState(0.6);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(autoPlay);
  const [visitedSegments, setVisitedSegments] = useState<number[]>([]);
  const [playbackRate, setPlaybackRate] = useState(1);

  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSegments = useCallback(async () => {
    try {
      const response = await apiClient.get(API_ROUTES.PROGRESS.SEGMENTS(assetId, 'video')) as { segments?: number[] };
      if (response.segments) {
        setVisitedSegments(response.segments);
      }
    } catch { /* silent */ }
  }, [assetId]);

  // Fetch initial visited segments
  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  // Load preferences
  useEffect(() => {
    const savedMode = localStorage.getItem('subtitle_mode') as SubtitleMode;
    if (savedMode === 'custom' || savedMode === 'native') {
      setSubtitleMode(savedMode);
    }
  }, []);

  const changeSubtitleMode = useCallback((mode: SubtitleMode) => {
    setSubtitleMode(mode);
    localStorage.setItem('subtitle_mode', mode);
  }, []);

  // Load more preferences
  useEffect(() => {
    const savedOpacity = localStorage.getItem('subtitle_opacity');
    if (savedOpacity) setSubtitleOpacity(parseFloat(savedOpacity));
  }, []);

  const changeSubtitleOpacity = useCallback((val: number) => {
    setSubtitleOpacity(val);
    localStorage.setItem('subtitle_opacity', String(val));
  }, []);

  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [handleFullscreenChange]);

  const applyInitialTime = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!initialTimeSet.current && initialTime > 0) {
      video.currentTime = initialTime;
      initialTimeSet.current = true;
    }
    
    // Apply current playback rate
    video.playbackRate = playbackRate;

    if (video.duration) {
      setDuration(video.duration);
    }
  }, [initialTime, playbackRate]);

  // Set initial position and duration
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset flag if asset changes
    initialTimeSet.current = false;
    setHasStartedPlaying(false);

    if (video.readyState >= 1) {
      applyInitialTime();
    }

    video.addEventListener('loadedmetadata', applyInitialTime);
    return () => video.removeEventListener('loadedmetadata', applyInitialTime);
  }, [assetId, applyInitialTime, playbackRate]);

  // Autoplay Effect
  useEffect(() => {
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay might be blocked by browser policy if no user interaction
        setIsPlaying(false);
        setHasStartedPlaying(false);
      });
    }
  }, [autoPlay, assetId]);

  // Save progress logic
  const saveProgress = useCallback(async (position: number, completed: boolean) => {
    try {
      window.dispatchEvent(new CustomEvent('video-progress', {
        detail: { assetId, position, completed }
      }));

      // Update visited segments locally for immediate feedback
      const segment = Math.floor(position / VIDEO_SEGMENT_SIZE);
      setVisitedSegments(prev => prev.includes(segment) ? prev : [...prev, segment].sort((a, b) => a - b));

      await apiClient.post(progressUrl, { assetId, courseId, position, duration });
    } catch { /* silent */ }
  }, [assetId, courseId, duration, progressUrl]);

  // Save progress every 5 seconds
  useEffect(() => {
    saveTimer.current = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        saveProgress(videoRef.current.currentTime, false);
      }
    }, VIDEO_SEGMENT_SIZE * 1000);
    return () => { if (saveTimer.current) clearInterval(saveTimer.current); };
  }, [assetId, saveProgress]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setHasStartedPlaying(true);
    }
    else v.pause();
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    saveProgress(duration, true);
    window.dispatchEvent(new CustomEvent('video-ended', {
      detail: { assetId }
    }));
  }, [assetId, duration, saveProgress]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const time = Number(e.target.value);
    v.currentTime = time;
    setCurrentTime(time);
  }, []);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const vol = Number(e.target.value);
    v.volume = vol;
    setVolume(vol);
  }, []);
  
  const handleRateChange = useCallback((rate: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  const toggleSubtitles = useCallback(() => {
    setShowSubtitles(prev => !prev);
  }, []);

  const toggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      c.requestFullscreen?.();
    }
    setShowSettings(false);
  }, []);

  const showControlsTemp = useCallback(() => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      // Solo ocultamos si el video se está reproduciendo
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false); 
      }
    }, 3000);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl overflow-hidden group w-full video-player-container bg-surface-950 aspect-video max-h-[70vh] cursor-pointer"
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
        onPlay={() => {
          setIsPlaying(true);
          setHasStartedPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
      >
        {subtitleMode === 'native' && subtitleSrc && showSubtitles && hasStartedPlaying && (
          <track kind="subtitles" src={subtitleSrc} label="Subtítulos" default />
        )}
      </video>

      {subtitleMode === 'custom' && subtitleSrc && hasStartedPlaying && (
        <SubtitleDisplay
          src={subtitleSrc}
          currentTime={currentTime}
          isVisible={showSubtitles}
          opacity={subtitleOpacity}
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
            subtitleOpacity={subtitleOpacity}
            onChangeSubtitleOpacity={changeSubtitleOpacity}
            onClose={toggleSettings}
          />
        )}

        {/* Seek bar */}
        <ProgressVideoBar
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          visitedSegments={visitedSegments}
        />

        {/* Bottom row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <PlayPauseButton
              isPlaying={isPlaying}
              onToggle={togglePlay}
            />
            <VolumeControl
              volume={volume}
              onVolumeChange={handleVolume}
            />
            <TimeDisplay
              currentTime={currentTime}
              duration={duration}
            />
          </div>

          <div className="flex items-center gap-2">
            <PlaybackRateButton
              playbackRate={playbackRate}
              onRateChange={handleRateChange}
            />
            
            {/* Subtitles Toggle (CC) */}
            {subtitleSrc && (
              <SubtitleToggleButton
                isVisible={showSubtitles}
                onToggle={toggleSubtitles}
              />
            )}

            {/* Subtitle Settings (Gear) */}
            {subtitleSrc && (
              <SettingsButton
                isOpen={showSettings}
                onToggle={toggleSettings}
              />
            )}

            {/* Fullscreen */}
            <FullscreenButton
              isFullscreen={isFullscreen}
              onToggle={toggleFullscreen}
            />
          </div>
        </div>
      </ControlOverlay>
    </div>
  );
}

