import React from 'react';
import { ScraperTaskStatus, ScraperTaskCategory, ScraperTaskAction } from '@scraper/features/task-management';
import { Icon, type IconName } from '@web/components/Icon';
import { Button } from '@web/components/Button';

export interface ScraperTask {
  id: string;
  category: ScraperTaskCategory;
  action: ScraperTaskAction;
  url: string;
  targetId: string | null;
  status: ScraperTaskStatus;
  progress: { step: string; status?: string; percent?: number } | null;
  metadata: any;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TaskItemProps {
  task: ScraperTask;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
}

const STATUS_CONFIG: Record<ScraperTaskStatus, { icon: IconName; color: string; getLabel: (task: ScraperTask) => string; cardStyle: string }> = {
  RUNNING: {
    icon: 'loader',
    color: 'bg-brand-600 text-white animate-pulse',
    getLabel: (task: ScraperTask) => task.progress?.step || 'Procesando...',
    cardStyle: 'bg-brand-900/10 border-brand-500/50 shadow-lg shadow-brand-500/5'
  },
  COMPLETED: {
    icon: 'check',
    color: 'bg-status-completed/10 text-status-completed',
    getLabel: () => 'Finalizado correctamente',
    cardStyle: 'bg-surface-900 border-border-subtle'
  },
  FAILED: {
    icon: 'alert-circle',
    color: 'bg-status-failed/10 text-status-failed',
    getLabel: (task: ScraperTask) => task.error || 'Error desconocido',
    cardStyle: 'bg-surface-900 border-border-subtle'
  },
  CANCELLED: {
    icon: 'x',
    color: 'bg-surface-800 text-text-muted',
    getLabel: () => 'Cancelado por el usuario',
    cardStyle: 'bg-surface-900 border-border-subtle'
  },
  PENDING: {
    icon: 'clock',
    color: 'bg-surface-800 text-text-muted',
    getLabel: () => 'Listo para iniciar',
    cardStyle: 'bg-surface-900 border-border-subtle'
  }
};

export const TaskItem: React.FC<TaskItemProps> = ({ task, onStart, onStop, onDelete }) => {
  const config = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;

  const getCliCommand = (task: ScraperTask) => {
    const cmd = task.action.toLowerCase().replace('_', '-');
    if (task.action.startsWith('DOWNLOAD') && task.targetId) {
      const type = task.metadata?.download || 'all';
      return `pnpm cli ${cmd} ${task.targetId} ${type}`;
    }
    const download = task.metadata?.includeDownload ? ` --download=${task.metadata.download || 'all'}` : '';
    return `pnpm cli ${cmd} ${task.url} ${download}`;
  };

  return (
    <div className={`group flex flex-col p-1 rounded-3xl border transition-all duration-500 ${config.cardStyle}`}>
      <div className="flex items-center gap-5 p-5">
        {/* State Icon */}
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-500 group-hover:scale-110 ${config.color}`}>
          <Icon name={task.status === 'RUNNING' ? 'loader' : config.icon} size="md" className={task.status === 'RUNNING' ? 'animate-spin' : ''} />
        </div>

        {/* Content Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className={`text-2xs uppercase font-semibold tracking-wider px-2 py-0.5 rounded-md ${task.category === 'course' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
              {task.category === 'course' ? 'Curso' : 'Learning Path'}
            </span>
            <span className="text-2xs text-text-muted opacity-40 font-mono tracking-tighter">ID: {task.id.slice(0, 8)}</span>
          </div>
          <h3 className="text-text-primary truncate mb-1 text-sm tracking-tight font-medium">{task.url}</h3>

          <div className="flex items-center gap-2">
            <p className={`text-xs ${task.status === 'RUNNING' ? 'text-brand-500' : 'text-text-muted opacity-60'}`}>
              {config.getLabel(task)}
            </p>
            {task.status === 'RUNNING' && task.progress?.percent !== undefined && (
              <span className="text-2xs font-mono text-brand-500 font-semibold bg-brand-500/10 px-1.5 rounded">
                {Math.round(task.progress.percent)}%
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-2">
          {task.status !== 'RUNNING' && (
            <Button
              variant="primary"
              square
              size="sm"
              icon="play"
              onClick={() => onStart(task.id)}
              className="shadow-lg shadow-brand-600/20"
              title="Iniciar tarea"
            />
          )}

          {task.status === 'RUNNING' && (
            <Button
              variant="danger"
              square
              size="sm"
              icon="square"
              onClick={() => onStop(task.id)}
              title="Detener tarea"
            />
          )}

          <Button
            variant="ghost"
            square
            size="sm"
            icon="trash"
            onClick={() => onDelete(task.id)}
            className="text-text-muted hover:text-status-failed hover:bg-status-failed/10"
            title="Eliminar"
          />
        </div>
      </div>

      {/* Progress Bar (Full Width at bottom if running) */}
      {task.status === 'RUNNING' && (
        <div className="h-1 w-full bg-surface-800 rounded-b-3xl overflow-hidden">
          <div
            className="h-full bg-brand-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--brand-500-rgb),0.5)]"
            style={{ width: `${task.progress?.percent || 0}%` }}
          />
        </div>
      )}

      {/* CLI Hint on hover */}
      <div className="max-h-0 group-hover:max-h-20 overflow-hidden transition-all duration-500 ease-in-out">
        <div className="px-5 pb-4 pt-1 border-t border-border-subtle/30 mt-1">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="terminal" size="xs" className="text-text-muted opacity-40" />
            <span className="text-2xs font-bold text-text-muted uppercase tracking-widest opacity-40">CLI Equivalent</span>
          </div>
          <div className="p-3 rounded-xl bg-black/20 border border-white/5 font-mono text-2xs text-text-muted whitespace-nowrap overflow-x-auto">
            {getCliCommand(task)}
          </div>
        </div>
      </div>
    </div>
  );
};
