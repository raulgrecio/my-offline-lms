import React, { useState, useEffect, useCallback } from 'react';

import { apiClient } from '@web/platform/api/client';
import { API_ROUTES } from '@web/platform/api/routes';
import { logger } from '@web/platform/logging';
import { EmptyState } from '@web/components/EmptyState';
import { AuthModal } from '@web/components/AuthModal';
import { useAuth } from '@web/hooks/useAuth';

import { TaskItem, type ScraperTask } from './_TaskItem';

export const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<ScraperTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  
  const { authStatus, checkAuth } = useAuth();

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

    const handleOpenModal = () => {
      setPendingTaskId(null);
      setShowAuthModal(true);
    };

    document.addEventListener('open-auth-modal', handleOpenModal);

    return () => {
      clearInterval(interval);
      document.removeEventListener('open-auth-modal', handleOpenModal);
    };
  }, []);

  const handleStart = async (taskId: string) => {
    // Check session first
    const isAuthenticated = await checkAuth();
    
    if (!isAuthenticated) {
      setPendingTaskId(taskId);
      setShowAuthModal(true);
      return;
    }

    try {
      await apiClient.post(API_ROUTES.SCRAPER.START, { taskId });
      fetchTasks();
    } catch (err) {
      logger.error('Error starting task:', err);
    }
  };

  const handleAuthSuccess = useCallback(async () => {
    if (pendingTaskId) {
      try {
        await apiClient.post(API_ROUTES.SCRAPER.START, { taskId: pendingTaskId });
        setPendingTaskId(null);
        setShowAuthModal(false);
        fetchTasks();
      } catch (err) {
        logger.error('Error starting task after auth:', err);
      }
    } else {
      setShowAuthModal(false);
    }
  }, [pendingTaskId]);

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
    <>
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

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
};
