import React from 'react';
import { LogConsole } from '@web/components/LogConsole';

export const LogConsoleShowcase: React.FC = () => {
  return (
    <div className="space-y-12">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">Standard View</h2>
            <p className="text-text-secondary text-sm">The console in its natural habitat, waiting for scraper logs.</p>
          </div>
          <div className="px-3 py-1 bg-brand-500/10 border border-brand-500/20 rounded-full">
            <span className="text-2xs font-bold text-brand-400 uppercase tracking-wider">Live SSE Component</span>
          </div>
        </div>

        <div className="max-w-4xl">
          <LogConsole />
        </div>
      </section>

      <section className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-text-primary">Key Features</h3>
            <ul className="space-y-3">
              {[
                { title: 'SSE Integration', desc: 'Real-time log streaming via EventSource protocol.' },
                { title: 'Auto-scroll Toggle', desc: 'Optional following of latest logs with smooth animations.' },
                { title: 'Connection Witness', desc: 'Visual ON/OFF and status indicators in header and footer.' },
                { title: 'ANSI-inspired Design', desc: 'Deep-dark theme with high-contrast log levels.' }
              ].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <div className="w-5 h-5 rounded bg-brand-500/20 text-brand-400 flex items-center justify-center shrink-0">
                    <span className="text-2xs font-bold">0{i + 1}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-primary">{item.title}</h4>
                    <p className="text-xs text-text-muted">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 bg-surface-950 border border-border-subtle rounded-2xl space-y-4">
            <h3 className="text-lg font-bold text-text-primary">Technical Specs</h3>
            <div className="space-y-2 font-mono text-2xs">
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-text-muted italic">Endpoint:</span>
                <span className="text-brand-400">/api/scraper/logs</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-text-muted italic">Buffer size:</span>
                <span className="text-text-primary">100 entries</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-text-muted italic">Encoding:</span>
                <span className="text-text-primary">UTF-8 / JSON</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted italic">Framework:</span>
                <span className="text-text-secondary">React 18 + SSE</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
