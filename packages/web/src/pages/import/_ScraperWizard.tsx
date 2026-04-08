import React, { useState, useEffect } from 'react';

import { generateId } from '@core/domain';
import { ScraperTaskCategory, ScraperTaskStatus } from '@scraper/features/task-management';

import { GenericWizard, type WizardStepConfig } from '@web/components/Wizard';
import { API_ROUTES } from '@web/platform/api/routes';
import { apiClient } from '@web/platform/api/client';
import { logger } from '@web/platform/logging';

import { SelectionStep } from './steps/_SelectionStep';
import { AuthStep } from './steps/_AuthStep';
import { ExecutionStep } from './steps/_ExecutionStep';

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
  type: ScraperTaskCategory;
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
  const [contentType, setContentType] = useState<ScraperTaskCategory>('course');
  const [downloadOptions, setDownloadOptions] = useState({ videos: true, guides: true });
  const [includeDownload, setIncludeDownload] = useState(true);

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
          const progressData = typeof task.progress === 'string' ? JSON.parse(task.progress) : task.progress;
          setTaskProgress(progressData || { step: 'Recuperando estado...' });
          // If we have an active task, we should be in the execution step
          // The GenericWizard currently doesn't expose a way to set the initial step via props easily 
          // without modifying it, but we can at least ensure we are tracking it.
          // For now, if taskId is set, we will show the ExecutionStep content.
        }
      })
      .catch(err => logger.error('Error checking active task:', err));
  }, []);

  // Polling for task progress
  useEffect(() => {
    let interval: any;
    if (taskId && (!executionResult || !executionResult.success)) {
      interval = setInterval(async () => {
        try {
          const task = await apiClient.get<any>(`${API_ROUTES.SCRAPER.STATUS}?taskId=${taskId}`);
          if (task) {
            const progressData = typeof task.progress === 'string' ? JSON.parse(task.progress) : task.progress;
            setTaskProgress(progressData || null);
            if (task.status === ScraperTaskStatus.COMPLETED) {
              setExecutionResult({ success: true, message: 'Proceso finalizado con éxito.' });
              setTaskId(null);
            } else if (task.status === ScraperTaskStatus.FAILED) {
              setExecutionResult({ success: false, message: task.error || 'Error en la ejecución.' });
              setTaskId(null);
            } else if (task.status === ScraperTaskStatus.CANCELLED) {
              setExecutionResult({ success: false, message: 'Proceso cancelado.' });
              setTaskId(null);
            }
          }
        } catch (err) {
          logger.error('Error polling task status:', err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [taskId, executionResult]);

  useEffect(() => {
    apiClient.get<AvailableContentResponse>(API_ROUTES.SCRAPER.AVAILABLE)
      .then(data => setAvailableContent(data))
      .catch((err: any) => logger.error('Error loading content', err));
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
      logger.error('Failed to launch login:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const cancelScraping = async () => {
    if (!taskId) return;
    try {
      await apiClient.post(API_ROUTES.SCRAPER.CANCEL, { taskId });
    } catch (err: any) {
      logger.error('Failed to cancel:', err);
    }
  };

  const handleToggleVideo = () => setDownloadOptions(p => ({ ...p, videos: !p.videos }));
  const handleToggleGuide = () => setDownloadOptions(p => ({ ...p, guides: !p.guides }));
  const handleToggleIncludeDownload = () => setIncludeDownload(prev => !prev);

  const startScraping = async () => {
    setIsLoading(true);
    const url = selectedItem ? selectedItem.url : newUrl;
    const type = selectedItem ? selectedItem.type : contentType;
    const targetId = selectedItem ? selectedItem.id : undefined;

    const id = generateId();
    // Defaulting to autoStart: false as per user feedback to 'create then play'
    const autoStart = false;

    try {
      const data = await apiClient.post<any>(API_ROUTES.SCRAPER.SYNC, {
        taskId: id,
        url,
        type,
        targetId,
        downloadVideos: downloadOptions.videos,
        downloadGuides: downloadOptions.guides,
        includeDownload,
        autoStart,
      });

      if (data.ok) {
        if (autoStart) {
          setTaskId(id);
          setExecutionResult(null);
        } else {
          // Task created but not started.
          setTaskId(null); // No polling needed
          setExecutionResult({
            success: true,
            message: 'Tarea registrada correctamente. Ya puedes iniciarla desde tu panel de tareas.'
          });
        }
      } else {
        setExecutionResult({ success: false, message: data.message });
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
        cancelScraping={cancelScraping}
        contentType={contentType}
        downloadOptions={downloadOptions}
        executionResult={executionResult}
        includeDownload={includeDownload}
        isLoading={isLoading || !!taskId}
        newUrl={newUrl}
        onToggleGuide={handleToggleGuide}
        onToggleIncludeDownload={handleToggleIncludeDownload}
        onToggleVideo={handleToggleVideo}
        selectedItem={selectedItem}
        startScraping={startScraping}
        taskProgress={taskProgress}
      />
    </GenericWizard>
  );
};
