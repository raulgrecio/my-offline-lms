import React, { useState, useEffect } from 'react';

import type { ScraperTaskStatus, ScraperTaskType } from '@scraper/features/task-management';

import { Icon, type IconName } from '@web/components/Icon';
import { Button } from '@web/components/Button';
import { apiClient } from '@web/platform/api/client';
import { API_ROUTES } from '@web/platform/api/routes';

interface ScraperTask {
  id: string;
  type: ScraperTaskType;
  url: string;
  targetId: string | null;
  status: ScraperTaskStatus;
  progress: { step: string; status?: string; percent?: number } | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
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
    color: 'bg-green-500/10 text-green-500',
    getLabel: () => 'Finalizado correctamente',
    cardStyle: 'bg-surface-900 border-border-subtle'
  },
  FAILED: {
    icon: 'alert-circle',
    color: 'bg-red-500/10 text-red-500',
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
    getLabel: () => 'Pendiente de iniciar',
    cardStyle: 'bg-surface-900 border-border-subtle'
  }
};

export const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<ScraperTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const data = await apiClient.get<ScraperTask[]>(API_ROUTES.SCRAPER.LIST);
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async (taskId: string) => {
    try {
      await apiClient.post(API_ROUTES.SCRAPER.START, { taskId });
      fetchTasks();
    } catch (err) {
      console.error('Error starting task:', err);
    }
  };

  const handleStop = async (taskId: string) => {
    try {
      await apiClient.post(API_ROUTES.SCRAPER.CANCEL, { taskId });
      fetchTasks();
    } catch (err) {
      console.error('Error stopping task:', err);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('¿Estás seguro de que quieres borrar esta tarea?')) return;
    try {
      await apiClient.post(API_ROUTES.SCRAPER.DELETE, { taskId });
      fetchTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Cargando tareas...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-surface-900 border border-dashed border-border-subtle rounded-3xl text-text-muted">
        <Icon name="inbox" size="xl" className="mb-4 opacity-20" />
        <p className="text-sm font-medium">No hay tareas pendientes</p>
        <p className="text-xs opacity-50 mt-1">Usa el mago de importación para crear una nueva</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const config = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;

        return (
          <div
            key={task.id}
            className={`flex items-center gap-6 p-6 rounded-3xl border transition-all hover:border-brand-500/30 ${config.cardStyle}`}
          >
            {/* Icono de Estado */}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${config.color}`}>
              <Icon name={config.icon} size="md" />
            </div>

            {/* Información Principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="font-bold text-text-primary truncate">{task.url}</h3>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md ${task.type === 'course' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'
                  }`}>
                  {task.type === 'course' ? 'Curso' : 'Learning Path'}
                </span>
                <p className="text-xs text-text-muted">
                  {config.getLabel(task)}
                </p>
                {task.status === 'RUNNING' && task.progress?.percent && (
                  <div className="w-24 h-1.5 bg-surface-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-500 transition-all duration-500"
                      style={{ width: `${task.progress.percent}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                square
                icon="external-link"
                onClick={() => window.open(task.url, '_blank')}
                title="Visitar plataforma"
              />
              {task.status !== 'RUNNING' && (
                <Button
                  variant="ghost"
                  square
                  icon="play"
                  onClick={() => handleStart(task.id)}
                  className="bg-surface-800"
                />
              )}

              {task.status === 'RUNNING' && (
                <Button
                  variant="ghost"
                  square
                  icon="square"
                  onClick={() => handleStop(task.id)}
                  className="bg-surface-800"
                />
              )}

              <Button
                variant="ghost"
                square
                icon="trash"
                onClick={() => handleDelete(task.id)}
                className="text-danger hover:bg-danger hover:text-white"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
