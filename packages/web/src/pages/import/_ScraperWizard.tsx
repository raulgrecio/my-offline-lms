import React, { useState, useEffect } from 'react';

import { GenericWizard, type WizardStepConfig } from '@web/components/Wizard';
import { API_ROUTES } from '@web/platform/api/routes';
import { apiClient } from '@web/platform/api/client';

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
  type: 'course' | 'path';
}

interface AvailableContentResponse {
  courses: ContentItem[];
  paths: any[];
}

interface AuthStatusResponse {
  isAuthenticated: boolean;
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
  const [availableContent, setAvailableContent] = useState<{ courses: ContentItem[], paths: any[] }>({ courses: [], paths: [] });
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [contentType, setContentType] = useState<'course' | 'path'>('course');
  const [downloadOptions, setDownloadOptions] = useState({ videos: true, guides: true });

  const [authStatus, setAuthStatus] = useState<{ isAuthenticated: boolean; message: string; checked: boolean }>({
    isAuthenticated: false,
    message: '',
    checked: false
  });

  const [authLoading, setAuthLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [executionResult, setExecutionResult] = useState<{ success: boolean; message: string } | null>(null);

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
        message: data.message,
        checked: true
      });
      return data.isAuthenticated;
    } catch (err: any) {
      setAuthStatus({
        isAuthenticated: false,
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

  const startScraping = async () => {
    setIsLoading(true);
    const url = selectedItem ? selectedItem.url : newUrl;
    const type = selectedItem ? selectedItem.type : contentType;

    try {
      const data = await apiClient.post<SyncResponse>(API_ROUTES.SCRAPER.SYNC, {
        url,
        type,
        downloadVideos: downloadOptions.videos,
        downloadGuides: downloadOptions.guides
      });
      setExecutionResult({ success: true, message: data.message });
    } catch (err: any) {
      setExecutionResult({ success: false, message: err.message || 'Error desconocido' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GenericWizard steps={stepsConfig}>
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
        isLoading={isLoading}
        executionResult={executionResult}
        selectedItem={selectedItem}
        newUrl={newUrl}
        contentType={contentType}
        startScraping={startScraping}
      />
    </GenericWizard>
  );
};
