import React, { useState, useEffect } from 'react';

import { generateId } from '@core/domain';
import { ScraperTaskCategory, type ScraperTaskCategoryType } from '@scraper/features/task-management/domain/models/ScraperTask';

import { GenericWizardLayout, useWizard, WizardProvider, type WizardStepConfig } from '@web/components/Wizard';
import { API_ROUTES } from '@web/platform/api/routes';
import { apiClient } from '@web/platform/api/client';
import { logger } from '@web/platform/logging';

import { SelectionStep } from './_SelectionStep';
import { AssetSelectionStep } from './_AssetSelectionStep';
import { SummaryStep } from './_SummaryStep';

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
  type: ScraperTaskCategoryType;
}

interface AvailableContentResponse {
  courses: ContentItem[];
  paths: any[];
}

const stepsConfig: WizardStepConfig[] = [
  { id: 'selection', label: 'Origen', icon: 'layers' },
  { id: 'assets', label: 'Assets', icon: 'settings' },
  { id: 'summary', label: 'Resumen', icon: 'check-circle' }
];

const ScraperWizardContent: React.FC = () => {
  const { reset } = useWizard();
  const [availableContent, setAvailableContent] = useState<AvailableContentResponse>({
    courses: [],
    paths: []
  });
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [contentType, setContentType] = useState<ScraperTaskCategoryType>(ScraperTaskCategory.COURSE);
  const [downloadOptions, setDownloadOptions] = useState({ videos: true, guides: true });

  const [isLoading, setIsLoading] = useState(false);
  const [executionResult, setExecutionResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    apiClient.get<AvailableContentResponse>(API_ROUTES.SCRAPER.AVAILABLE)
      .then(data => setAvailableContent(data))
      .catch((err: any) => logger.error('Error loading content', err));
  }, []);

  const handleToggleVideo = () => setDownloadOptions(p => ({ ...p, videos: !p.videos }));
  const handleToggleGuide = () => setDownloadOptions(p => ({ ...p, guides: !p.guides }));

  const finishWizardWithReset = () => {
    // Reset form data after success (except result to show it)
    setSelectedItem(null);
    setNewUrl('');

    // 1. Trigger event for Astro to collapse the card
    const event = new CustomEvent('wizard-finished');

    // 2. Reset the wizard state using the context
    setTimeout(() => {
      document.dispatchEvent(event);
      reset();
      setExecutionResult(null);
    }, 5000); // Small delay after collapse to ensure smooth animation
  };

  const startScraping = async () => {
    setIsLoading(true);
    const url = selectedItem ? selectedItem.url : newUrl;
    const type = selectedItem ? selectedItem.type : contentType;
    const targetId = selectedItem ? selectedItem.id : undefined;

    const id = generateId();
    const autoStart = false;

    try {
      const data = await apiClient.post<any>(API_ROUTES.SCRAPER.SYNC, {
        taskId: id,
        url,
        type,
        targetId,
        downloadVideos: downloadOptions.videos,
        downloadGuides: downloadOptions.guides,
        includeDownload: true,
        autoStart,
      });

      if (data.ok) {
        setExecutionResult({
          success: true,
          message: 'Tarea registrada correctamente. Ya puedes iniciarla desde tu panel de tareas.'
        });



        finishWizardWithReset()
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
    <GenericWizardLayout steps={stepsConfig}>
      <SelectionStep
        availableContent={availableContent}
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
        newUrl={newUrl}
        setNewUrl={setNewUrl}
        contentType={contentType}
        setContentType={setContentType}
      />

      <AssetSelectionStep
        contentType={contentType}
        downloadOptions={downloadOptions}
        onToggleGuide={handleToggleGuide}
        onToggleVideo={handleToggleVideo}
      />

      <SummaryStep
        contentType={contentType}
        downloadOptions={downloadOptions}
        executionResult={executionResult}
        isLoading={isLoading}
        newUrl={newUrl}
        selectedItem={selectedItem}
        startScraping={startScraping}
      />
    </GenericWizardLayout>
  );
};

export const ScraperWizard: React.FC = () => {
  return (
    <WizardProvider steps={stepsConfig}>
      <ScraperWizardContent />
    </WizardProvider>
  );
};
