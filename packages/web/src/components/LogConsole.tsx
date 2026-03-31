import React, { useState, useEffect, useRef } from 'react';

import { Icon } from '@web/components/Icon';
import { API_ROUTES } from '@web/platform/api/routes';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  context: string;
  message: string;
}

export const LogConsole: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource(API_ROUTES.SCRAPER.LOGS);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      const newLog: LogEntry = JSON.parse(event.data);
      setLogs(prev => [...prev.slice(-100), newLog]);
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, []);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-brand-400 font-bold';
      case 'debug': return 'text-text-muted opacity-60';
      default: return 'text-text-secondary';
    }
  };

  return (
    <div className="flex flex-col bg-surface-950 border border-border-subtle rounded-2xl overflow-hidden shadow-2xl h-[400px]">
      {/* Console Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-900 border-b border-border-subtle">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
          </div>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] font-mono">Scraper_Terminal_v1.0.exe</span>
          <div className="flex items-center gap-2 ml-4 border-l border-border-subtle pl-4">
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">{isConnected ? 'ON' : 'OFF'}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-[10px] font-bold px-2 py-1 rounded border transition-all ${autoScroll ? 'bg-brand-600/20 border-brand-500/50 text-brand-400' : 'bg-surface-800 border-border-subtle text-text-muted hover:text-text-primary'}`}
          >
            {autoScroll ? 'AUTO-SCROLL ON' : 'AUTO-SCROLL OFF'}
          </button>
          <button
            onClick={() => setLogs([])}
            className="text-text-muted hover:text-red-400 transition-colors"
            title="Clear console"
          >
            <Icon name="trash" size="xs" />
          </button>
        </div>
      </div>

      {/* Console Content */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 font-mono text-[11px] overflow-y-auto custom-scrollbar bg-brand-950/10"
      >
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-muted italic opacity-30 select-none">
            Esperando logs de actividad...
          </div>
        ) : (
          <div className="space-y-1.5 pb-10">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3 group animate-in fade-in duration-300">
                <span className="text-text-muted opacity-30 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                <span className={`uppercase font-bold w-12 text-right ${getLevelColor(log.level)}`}>{log.level}</span>
                <span className="text-brand-500 opacity-60">[{log.context}]</span>
                <span className="text-text-primary flex-1 break-all group-hover:text-white transition-colors">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Console Status Bar */}
      <div className="px-4 py-1.5 bg-brand-600/5 border-t border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">{isConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
        </div>
        <span className="text-[9px] font-mono text-text-muted opacity-50">UTF-8 / Node.js 20.x</span>
      </div>
    </div>
  );
};
