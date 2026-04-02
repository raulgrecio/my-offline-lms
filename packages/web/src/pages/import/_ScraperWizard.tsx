import React, { useState, useEffect } from 'react';

import { GenericWizard, type WizardStepConfig } from '@web/components/Wizard';
import { API_ROUTES } from '@web/platform/api/routes';
import { apiClient } from '@web/platform/api/client';

import { SelectionStep } from './steps/_SelectionStep';
import { AuthStep } from './steps/_AuthStep';
import { ExecutionStep } from './steps/_ExecutionStep';
import type { ScraperTaskType } from '@scraper/features/task-management';

interface ContentItem {
  id: string;
  title: string;
  url: string;
  localUrl: string;
  totalAssets: number;
  downloadedAssets: number;
  totalVideos: number;
  downloadedVideos: number;
  totalGuides: number;
  downloadedGuides: number;
  isComplete: boolean;
  type: ScraperTaskType;
}

interface AvailableContentResponse {
  courses: ContentItem[];
  paths: any[];
}

interface AuthStatusResponse {
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  message: string;
}

interface SyncResponse {
  ok: boolean;
  message: string;
}

const stepsConfig: WizardStepConfig[] = [
  { id: 'selection', label: 'Origen', icon: 'layers' },
  { id: 'auth', label: 'Sesión', icon: 'lock' },
  { id: 'execution', label: 'Descarga', icon: 'play' }
];

export const ScraperWizard: React.FC = () => {
  const [availableContent, setAvailableContent] = useState<AvailableContentResponse>({
    courses: [],
    paths: []
  });
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [contentType, setContentType] = useState<ScraperTaskType>('course');
  const [downloadOptions, setDownloadOptions] = useState({ videos: true, guides: true });

  const [authStatus, setAuthStatus] = useState<{ isAuthenticated: boolean; isLoggingIn: boolean; message: string; checked: boolean }>({
    isAuthenticated: false,
    isLoggingIn: false,
    message: '',
    checked: false
  });

  const [authLoading, setAuthLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [executionResult, setExecutionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskProgress, setTaskProgress] = useState<{ step: string, status?: string } | null>(null);

  // Check for active tasks on mount
  useEffect(() => {
    apiClient.get<any>(API_ROUTES.SCRAPER.STATUS)
      .then(task => {
        if (task && task.id && task.status === 'RUNNING') {
          setTaskId(task.id);
          setTaskProgress(task.progress ? JSON.parse(task.progress) : { step: 'Recuperando estado...' });
          // If we have an active task, we should be in the execution step
          // The GenericWizard currently doesn't expose a way to set the initial step via props easily 
          // without modifying it, but we can at least ensure we are tracking it.
          // For now, if taskId is set, we will show the ExecutionStep content.
        }
      })
      .catch(err => console.error('Error checking active task:', err));
  }, []);

  // Polling for task progress
  useEffect(() => {
    let interval: any;
    if (taskId && (!executionResult || !executionResult.success)) {
      interval = setInterval(async () => {
        try {
          const task = await apiClient.get<any>(`${API_ROUTES.SCRAPER.STATUS}?taskId=${taskId}`);
          if (task) {
            setTaskProgress(task.progress ? JSON.parse(task.progress) : null);
            if (task.status === 'COMPLETED') {
              setExecutionResult({ success: true, message: 'Proceso finalizado con éxito.' });
              setTaskId(null);
            } else if (task.status === 'FAILED') {
              setExecutionResult({ success: false, message: task.error || 'Error en la ejecución.' });
              setTaskId(null);
            } else if (task.status === 'CANCELLED') {
              setExecutionResult({ success: false, message: 'Proceso cancelado.' });
              setTaskId(null);
            }
          }
        } catch (err) {
          console.error('Error polling task status:', err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [taskId, executionResult]);

  useEffect(() => {
    apiClient.get<AvailableContentResponse>(API_ROUTES.SCRAPER.AVAILABLE)
      .then(data => setAvailableContent(data))
      .catch((err: any) => console.error('Error loading content', err));
  }, []);

  const checkAuth = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<AuthStatusResponse>(API_ROUTES.SCRAPER.AUTH_STATUS);
      setAuthStatus({
        isAuthenticated: data.isAuthenticated,
        isLoggingIn: data.isLoggingIn,
        message: data.message,
        checked: true
      });
      return data.isAuthenticated;
    } catch (err: any) {
      setAuthStatus({
        isAuthenticated: false,
        isLoggingIn: false,
        message: err.message || 'Error al verificar sesión',
        checked: true
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const launchLogin = async () => {
    setAuthLoading(true);
    try {
      await apiClient.post(API_ROUTES.SCRAPER.LOGIN);
    } catch (err: any) {
      console.error('Failed to launch login:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const cancelScraping = async () => {
    if (!taskId) return;
    try {
      await apiClient.post(API_ROUTES.SCRAPER.CANCEL, { taskId });
    } catch (err: any) {
      console.error('Failed to cancel:', err);
    }
  };

  const startScraping = async () => {
    setIsLoading(true);
    const url = selectedItem ? selectedItem.url : newUrl;
    const type = selectedItem ? selectedItem.type : contentType;
    const targetId = selectedItem ? selectedItem.id : undefined;

    try {
      const data = await apiClient.post<any>(API_ROUTES.SCRAPER.SYNC, {
        url,
        type,
        targetId,
        downloadVideos: downloadOptions.videos,
        downloadGuides: downloadOptions.guides
      });
      if (data.taskId) {
        setTaskId(data.taskId);
        setExecutionResult(null);
        // We could also redirect to tasks tab here if we wanted, 
        // but for now let's keep the wizard flow.
      } else {
        setExecutionResult({ success: true, message: data.message });
      }
    } catch (err: any) {
      setExecutionResult({ success: false, message: err.message || 'Error desconocido' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GenericWizard steps={stepsConfig} initialStepId={taskId ? 'execution' : undefined}>
      <SelectionStep
        availableContent={availableContent}
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
        newUrl={newUrl}
        setNewUrl={setNewUrl}
        contentType={contentType}
        setContentType={setContentType}
      />

      <AuthStep
        authStatus={authStatus}
        isLoading={isLoading}
        authLoading={authLoading}
        checkAuth={checkAuth}
        launchLogin={launchLogin}
      />

      <ExecutionStep
        downloadOptions={downloadOptions}
        setDownloadOptions={setDownloadOptions}
        isLoading={isLoading || !!taskId}
        executionResult={executionResult}
        taskProgress={taskProgress}
        selectedItem={selectedItem}
        newUrl={newUrl}
        contentType={contentType}
        startScraping={startScraping}
        cancelScraping={cancelScraping}
      />
    </GenericWizard>
  );
};
