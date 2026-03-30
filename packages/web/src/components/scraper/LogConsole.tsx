import React, { useEffect, useState, useRef } from 'react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: string;
}

export const LogConsole: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const eventSource = new EventSource('/api/scraper/logs');

    eventSource.onopen = () => setIsConnected(true);
    eventSource.onerror = () => setIsConnected(false);
    
    eventSource.onmessage = (event) => {
      const entry: LogEntry = JSON.parse(event.data);
      setLogs(prev => [...prev.slice(-199), entry]);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'info': return 'text-brand-400';
      case 'warn': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      case 'debug': return 'text-text-muted';
      default: return 'text-text-primary';
    }
  };

  return (
    <div className="flex flex-col h-[400px] bg-surface-950 border border-border-default rounded-2xl overflow-hidden font-mono text-xs">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-900 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
          </div>
          <span className="ml-2 font-bold text-text-muted uppercase tracking-widest text-[10px]">Scraper Logs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-[10px] text-text-muted">{isConnected ? 'ON' : 'OFF'}</span>
        </div>
      </div>

      {/* Log Content */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar scroll-smooth"
      >
        {logs.length === 0 && (
          <div className="h-full flex items-center justify-center text-text-muted opacity-50 italic">
            Esperando logs...
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-3 hover:bg-white/5 py-0.5 rounded px-1 transition-colors group">
            <span className="text-text-muted opacity-40 shrink-0">
              {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
            </span>
            <span className={`font-bold shrink-0 w-12 uppercase ${getLevelColor(log.level)}`}>
              {log.level}
            </span>
            {log.context && (
                <span className="text-brand-500 font-bold shrink-0">
                    [{log.context}]
                </span>
            )}
            <span className="text-text-primary break-all">
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
