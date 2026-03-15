import { useState, useEffect, useRef } from 'react';

interface Cue {
  start: number;
  end: number;
  text: string;
}

export interface SubtitleDisplayProps {
  src: string;
  currentTime: number;
  isVisible: boolean;
}

export default function SubtitleDisplay({ src, currentTime, isVisible }: SubtitleDisplayProps) {
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
        const response = await fetch(src);
        if (!response.ok) return;
        const text = await response.text();
        parseVTT(text);
      } catch (error) {
        console.error('Error fetching subtitles:', error);
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

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartMousePos.current = { x: e.clientX, y: e.clientY };
    dragStartElementPos.current = { x: position.x, y: position.y };
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const parent = containerRef.current.parentElement;
      if (!parent) return;

      const parentRect = parent.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      const dx = e.clientX - dragStartMousePos.current.x;
      const dy = e.clientY - dragStartMousePos.current.y;

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

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
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
        className={`bg-black/75 backdrop-blur-md text-white px-5 py-2.5 rounded-xl text-center text-sm sm:text-lg select-none cursor-move active:cursor-grabbing transition-shadow ${isDragging ? 'shadow-2xl ring-2 ring-white/20' : 'shadow-lg border border-white/10'}`}
        style={{
          pointerEvents: 'auto',
          wordWrap: 'break-word',
          width: 'max-content',
          maxWidth: '100%'
        }}
        dangerouslySetInnerHTML={{ __html: activeCue.text.replace(/\n/g, '<br/>') }}
      />
    </div>
  );
}
