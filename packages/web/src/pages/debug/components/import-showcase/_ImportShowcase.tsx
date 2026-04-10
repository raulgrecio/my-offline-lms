import React, { useState } from 'react';
import { Icon } from '@web/components/Icon';
import { GenericWizard, type WizardStepConfig } from '@web/components/Wizard';

// Import existing steps
import { SelectionStep } from '@web/pages/import/components/ScraperWizard/_SelectionStep';
import { AssetSelectionStep } from '@web/pages/import/components/ScraperWizard/_AssetSelectionStep';
import { SummaryStep } from '@web/pages/import/components/ScraperWizard/_SummaryStep';
import { ScraperTaskCategory, type ScraperTaskCategoryType } from '@scraper/features/task-management/domain/models/ScraperTask';
import type { ContentItem } from '@web/pages/import/components/_ContentItemCard';

const stepsConfig: WizardStepConfig[] = [
  { id: 'selection', label: 'Origen', icon: 'layers' },
  { id: 'assets', label: 'Assets', icon: 'settings' },
  { id: 'summary', label: 'Resumen', icon: 'check-circle' }
];

const mockAvailableContent: { courses: ContentItem[], paths: ContentItem[] } = {
  courses: [
    {
      id: 'c1',
      title: 'Oracle Cloud Infrastructure Foundations (2024)',
      url: 'https://mylearn.example.com/ou/course/oci-foundations/123',
      localUrl: '',
      totalAssets: 45,
      downloadedAssets: 12,
      totalVideos: 10,
      downloadedVideos: 5,
      totalGuides: 35,
      downloadedGuides: 7,
      isComplete: false,
      type: ScraperTaskCategory.COURSE
    },
    {
      id: 'c2',
      title: 'Java SE 21 Developer Professional',
      url: 'https://mylearn.example.com/ou/course/java-se-21/456',
      localUrl: '',
      totalAssets: 120,
      downloadedAssets: 0,
      totalVideos: 40,
      downloadedVideos: 0,
      totalGuides: 80,
      downloadedGuides: 0,
      isComplete: false,
      type: ScraperTaskCategory.COURSE
    },
    {
      id: 'c3',
      title: 'Oracle AI in Fusion Cloud Human Capital Management (HCM) - NEW!',
      url: 'https://mylearn.example.com/ou/course/java-se-21/456',
      localUrl: '',
      totalAssets: 100,
      downloadedAssets: 0,
      totalVideos: 50,
      downloadedVideos: 0,
      totalGuides: 50,
      downloadedGuides: 0,
      isComplete: false,
      type: ScraperTaskCategory.COURSE
    },
    {
      id: 'c4',
      title: 'Oracle Cloud Database Services Specialist',
      url: 'https://mylearn.example.com/ou/course/db-services/789',
      localUrl: '',
      totalAssets: 80,
      downloadedAssets: 0,
      totalVideos: 20,
      downloadedVideos: 0,
      totalGuides: 60,
      downloadedGuides: 0,
      isComplete: false,
      type: ScraperTaskCategory.COURSE
    },
    {
      id: 'c5',
      title: 'DevOps on Oracle Cloud Infrastructure',
      url: 'https://mylearn.example.com/ou/course/devops/012',
      localUrl: '',
      totalAssets: 60,
      downloadedAssets: 0,
      totalVideos: 15,
      downloadedVideos: 0,
      totalGuides: 45,
      downloadedGuides: 0,
      isComplete: false,
      type: ScraperTaskCategory.COURSE
    }
  ],
  paths: []
};

type SceneId = 'selection_empty' | 'selection_populated' | 'assets_config' | 'summary_ready' | 'summary_complete';

export const ImportShowcase: React.FC = () => {
  const [scene, setScene] = useState<SceneId>('selection_populated');

  // State
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [newUrl, setNewUrl] = useState('');
  const [contentType, setContentType] = useState<ScraperTaskCategoryType>(ScraperTaskCategory.COURSE);
  const [downloadOptions, setDownloadOptions] = useState({ videos: true, guides: true });
  const [executionResult, setExecutionResult] = useState<any>(
    scene === 'summary_complete' ? { success: true, message: 'Tarea registrada correctamente. Ya puedes iniciarla desde tu panel de tareas.' } : null
  );

  // Sync state with scene changes
  React.useEffect(() => {
    if (scene === 'summary_complete') {
      setExecutionResult({ success: true, message: 'Tarea registrada correctamente. Ya puedes iniciarla desde tu panel de tareas.' });
    } else {
      setExecutionResult(null);
    }
  }, [scene]);

  const scenes: { id: SceneId; label: string; group: string }[] = [
    { id: 'selection_empty', label: 'Carga: Vacío', group: 'Step 1' },
    { id: 'selection_populated', label: 'Carga: Items', group: 'Step 1' },
    { id: 'assets_config', label: 'Selección Assets', group: 'Step 2' },
    { id: 'summary_ready', label: 'Resumen Listo', group: 'Step 3' },
    { id: 'summary_complete', label: 'Éxito Final', group: 'Step 3' },
  ];

  const currentStepId = scene.startsWith('selection') ? 'selection' : (scene.startsWith('assets') ? 'assets' : 'summary');

  return (
    <div className="space-y-10">
      {/* Scene Selector */}
      <div className="flex flex-wrap gap-4 p-6 bg-surface-950/80 backdrop-blur rounded-3xl border border-white/5 sticky top-0 z-50 shadow-xl">
        {['Step 1', 'Step 2', 'Step 3'].map(group => (
          <div key={group} className="space-y-3">
            <div className="text-2xs font-black text-brand-500/60 uppercase tracking-[0.3em] ml-1">{group}</div>
            <div className="flex gap-2">
              {scenes.filter(s => s.group === group).map(s => (
                <button
                  key={s.id}
                  onClick={() => setScene(s.id)}
                  className={`px-4 py-2 text-2xs font-bold rounded-xl transition-all border ${scene === s.id ? 'bg-brand-600 border-brand-500 text-white shadow-xl shadow-brand-600/20 translate-y-[-2px]' : 'bg-surface-900 border-border-subtle text-text-muted hover:border-brand-500/50 hover:bg-surface-800'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-10 bg-surface-900 border border-border-subtle rounded-[3rem] shadow-inner">
        <GenericWizard steps={stepsConfig} initialStepId={currentStepId} key={currentStepId}>
          <SelectionStep
            availableContent={scene === 'selection_empty' ? { courses: [], paths: [] } : mockAvailableContent}
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
            onToggleVideo={() => setDownloadOptions(p => ({ ...p, videos: !p.videos }))}
            onToggleGuide={() => setDownloadOptions(p => ({ ...p, guides: !p.guides }))}
          />

          <SummaryStep
            downloadOptions={downloadOptions}
            isLoading={false}
            executionResult={executionResult}
            selectedItem={selectedItem || mockAvailableContent.courses[0]}
            newUrl={newUrl}
            contentType={contentType}
            startScraping={async () => { setScene('summary_complete'); }}
          />
        </GenericWizard>
      </div>

      {/* States Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-8 bg-surface-950/40 rounded-4xl border border-white/5 space-y-4">
          <div className="w-10 h-10 bg-brand-600/10 text-brand-400 rounded-2xl flex items-center justify-center">
            <Icon name="layers" size="sm" />
          </div>
          <h4 className="font-bold text-text-primary tracking-tight">Paso 1: Origen</h4>
          <p className="text-xs text-text-muted leading-relaxed opacity-60">Selección del curso o introducción de una URL manual.</p>
        </div>
        <div className="p-8 bg-surface-950/40 rounded-4xl border border-white/5 space-y-4">
          <div className="w-10 h-10 bg-brand-600/10 text-brand-400 rounded-2xl flex items-center justify-center">
            <Icon name="settings" size="sm" />
          </div>
          <h4 className="font-bold text-text-primary tracking-tight">Paso 2: Assets</h4>
          <p className="text-xs text-text-muted leading-relaxed opacity-60">Configuración granular de los activos a sincronizar (Vídeos/PDFs).</p>
        </div>
        <div className="p-8 bg-surface-950/40 rounded-4xl border border-white/5 space-y-4">
          <div className="w-10 h-10 bg-brand-600/10 text-brand-400 rounded-2xl flex items-center justify-center">
            <Icon name="check-circle" size="sm" />
          </div>
          <h4 className="font-bold text-text-primary tracking-tight">Paso 3: Resumen</h4>
          <p className="text-xs text-text-muted leading-relaxed opacity-60">Revisión final de los datos y registro de la tarea en la base de datos.</p>
        </div>
      </div>
    </div>
  );
};
