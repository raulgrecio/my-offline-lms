import React, { useState, useEffect } from 'react';

import { apiClient } from '@web/platform/api/client';
import { API_ROUTES } from '@web/platform/api/routes';
import { logger } from '@web/platform/logging';
import { EmptyState } from '@web/components/EmptyState';

import { TaskItem, type ScraperTask } from './_TaskItem';

export const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<ScraperTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const data = await apiClient.get<ScraperTask[]>(API_ROUTES.SCRAPER.LIST);
      setTasks(data);
    } catch (err) {
      logger.error('Error fetching tasks:', err);
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
      logger.error('Error starting task:', err);
    }
  };

  const handleStop = async (taskId: string) => {
    try {
      await apiClient.post(API_ROUTES.SCRAPER.CANCEL, { taskId });
      fetchTasks();
    } catch (err) {
      logger.error('Error stopping task:', err);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('¿Estás seguro de que quieres borrar esta tarea?')) return;
    try {
      await apiClient.post(API_ROUTES.SCRAPER.DELETE, { taskId });
      fetchTasks();
    } catch (err) {
      logger.error('Error deleting task:', err);
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <EmptyState
        variant="loading"
        message="Cargando tareas..."
      />
    );
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon="inbox"
        title="No hay tareas pendientes"
        message="Usa el asistente de importación para crear una nueva"
      />
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onStart={handleStart}
          onStop={handleStop}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
};
