import { useState, useEffect, useRef } from 'react';

import { apiClient } from '@web/platform/api/client';
import { logger } from '@web/platform/logging';

interface Cue {
  start: number;
  end: number;
  text: string;
}

export interface SubtitleDisplayProps {
  src: string;
  currentTime: number;
  isVisible: boolean;
  opacity?: number;
}

export default function SubtitleDisplay({ src, currentTime, isVisible, opacity = 0.85 }: SubtitleDisplayProps) {
  const [cues, setCues] = useState<Cue[]>([]);
  const [activeCue, setActiveCue] = useState<Cue | null>(null);

  // Position as percentage of parent container (0-100)
  // Default: centered (50%) and near bottom (15%)
  const [position, setPosition] = useState({ x: 50, y: 15 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStartMousePos = useRef({ x: 0, y: 0 });
  const dragStartElementPos = useRef({ x: 50, y: 15 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Load position from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('subtitle_position');
    if (saved) {
      try {
        const { x, y } = JSON.parse(saved);
        setPosition({ x, y });
      } catch (e) { /* ignore corrupted data */ }
    }
  }, []);

  // Re-clamp position whenever container size changes (e.g. fullscreen toggle)
  useEffect(() => {
    if (!containerRef.current) return;

    const parent = containerRef.current.parentElement;
    if (!parent) return;

    const clamp = () => {
      if (!containerRef.current) return;
      const parentRect = parent.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      if (parentRect.width === 0 || parentRect.height === 0) return;

      const halfWidthPercent = (containerRect.width / 2 / parentRect.width) * 100;
      const heightPercent = (containerRect.height / parentRect.height) * 100;

      setPosition(prev => ({
        x: Math.max(halfWidthPercent, Math.min(100 - halfWidthPercent, prev.x)),
        y: Math.max(0, Math.min(100 - heightPercent, prev.y))
      }));
    };

    // Run when parent or container resizes
    const observer = new ResizeObserver(clamp);
    observer.observe(parent);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [cues, isVisible, activeCue]);

  useEffect(() => {
    if (!src) return;

    const fetchVTT = async () => {
      try {
        const text = await apiClient.getText(src);
        parseVTT(text);
      } catch (error) {
        logger.error('Error fetching subtitles:', error);
      }
    };

    const parseVTT = (vttText: string) => {
      const parsedCues: Cue[] = [];
      const lines = vttText.split(/\r?\n/);

      let i = 0;
      while (i < lines.length && !lines[i].includes('-->')) {
        i++;
      }

      while (i < lines.length) {
        const line = lines[i].trim();
        if (line.includes('-->')) {
          const [startStr, middle] = line.split('-->').map(s => s.trim());
          const endStr = middle.split(/\s+/)[0];

          const start = parseTimestamp(startStr);
          const end = parseTimestamp(endStr);

          let text = '';
          i++;
          while (i < lines.length && lines[i].trim() === '') i++;

          while (i < lines.length && lines[i].trim() !== '' && !lines[i].includes('-->')) {
            text += (text ? '\n' : '') + lines[i].trim();
            i++;
          }

          if (text) {
            parsedCues.push({ start, end, text });
          }
          if (i < lines.length && lines[i].includes('-->')) continue;
        }
        i++;
      }
      setCues(parsedCues);
    };

    const parseTimestamp = (timeStr: string): number => {
      const cleanTime = timeStr.trim().split(/\s+/)[0];
      const parts = cleanTime.split(':');
      let h = 0, m = 0, s = 0;

      if (parts.length === 3) {
        h = parseFloat(parts[0]);
        m = parseFloat(parts[1]);
        s = parseFloat(parts[2].replace(',', '.'));
      } else if (parts.length === 2) {
        m = parseFloat(parts[0]);
        s = parseFloat(parts[1].replace(',', '.'));
      }

      return (isNaN(h) ? 0 : h) * 3600 + (isNaN(m) ? 0 : m) * 60 + (isNaN(s) ? 0 : s);
    };

    fetchVTT();
  }, [src]);

  useEffect(() => {
    const cue = cues.find(c => currentTime >= c.start && currentTime <= c.end);
    setActiveCue(cue || null);
  }, [currentTime, cues]);

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartMousePos.current = { x: clientX, y: clientY };
    dragStartElementPos.current = { x: position.x, y: position.y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging || !containerRef.current) return;

      const parent = containerRef.current.parentElement;
      if (!parent) return;

      const parentRect = parent.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      const dx = clientX - dragStartMousePos.current.x;
      const dy = clientY - dragStartMousePos.current.y;

      let newXPixels = (dragStartElementPos.current.x / 100) * parentRect.width + dx;
      let newYPixelsFromBottom = (dragStartElementPos.current.y / 100) * parentRect.height - dy;

      const halfWidth = containerRect.width / 2;
      const containerHeight = containerRect.height;

      newXPixels = Math.max(halfWidth, Math.min(parentRect.width - halfWidth, newXPixels));
      newYPixelsFromBottom = Math.max(0, Math.min(parentRect.height - containerHeight, newYPixelsFromBottom));

      const newPos = {
        x: (newXPixels / parentRect.width) * 100,
        y: (newYPixelsFromBottom / parentRect.height) * 100
      };

      setPosition(newPos);
      localStorage.setItem('subtitle_position', JSON.stringify(newPos));
    };

    const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
        // Prevent scrolling while dragging subtitles
        if (e.cancelable) e.preventDefault();
      }
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging]);

  if (!activeCue || !isVisible) return null;

  return (
    <div
      ref={containerRef}
      className="absolute pointer-events-none z-50 flex items-center justify-center p-2"
      style={{
        left: `${position.x}%`,
        bottom: `${position.y}%`,
        transform: 'translate(-50%, 0)',
        maxWidth: '90%',
        minWidth: '200px'
      }}
    >
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={(e) => e.stopPropagation()}
        className={`px-5 py-2.5 rounded-xl text-center text-sm sm:text-lg select-none cursor-move active:cursor-grabbing transition-shadow text-subtitle-text border border-white/10 pointer-events-auto wrap-break-word w-max max-w-full ${isDragging ? 'shadow-2xl ring-2 ring-white/20' : 'shadow-lg'}`}
        style={{ backgroundColor: `color-mix(in srgb, var(--bg-subtitle-constant) ${Math.round(opacity * 100)}%, transparent)` }}
        dangerouslySetInnerHTML={{ __html: activeCue.text.replace(/\n/g, '<br/>') }}
      />
    </div>
  );
}
