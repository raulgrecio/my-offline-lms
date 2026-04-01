import React, { useState } from 'react';
import { Icon } from '@web/components/Icon';
import { GenericWizard, type WizardStepConfig } from '@web/components/Wizard';

// Import existing steps
import { SelectionStep } from '@web/pages/import/steps/_SelectionStep';
import { AuthStep } from '@web/pages/import/steps/_AuthStep';
import { ExecutionStep } from '@web/pages/import/steps/_ExecutionStep';

const stepsConfig: WizardStepConfig[] = [
  { id: 'selection', label: 'Origen', icon: 'layers' },
  { id: 'auth', label: 'Sesión', icon: 'lock' },
  { id: 'execution', label: 'Descarga', icon: 'play' }
];

const mockAvailableContent = {
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
      type: 'course' as const
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
      type: 'course' as const
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
      type: 'course' as const
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
      type: 'course' as const
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
      type: 'course' as const
    }
  ],
  paths: []
};

type SceneId = 'selection_empty' | 'selection_populated' | 'selection_scroll' | 'auth_checking' | 'auth_success' | 'auth_error' | 'exec_ready' | 'exec_running' | 'exec_complete';

export const ImportShowcase: React.FC = () => {
  const [scene, setScene] = useState<SceneId>('selection_populated');

  // State for SelectionStep
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [newUrl, setNewUrl] = useState('');
  const [contentType, setContentType] = useState<'course' | 'path'>('course');

  // State for AuthStep
  const [authStatus, setAuthStatus] = useState({
    isAuthenticated: scene === 'auth_success',
    message: scene === 'auth_success' ? 'Sesión de Oracle validada correctamente.' : (scene === 'auth_error' ? 'No se detectó una sesión activa en el navegador.' : ''),
    checked: scene !== 'auth_checking' && scene !== 'selection_empty' && scene !== 'selection_populated'
  });

  // State for ExecutionStep
  const [downloadOptions, setDownloadOptions] = useState({ videos: true, guides: true });
  const [taskProgress, setTaskProgress] = useState<any>(
    scene === 'exec_running' ? { step: 'Descargando Video: Introducción a OCI...', status: 'Sincronizando' } : null
  );
  const [executionResult, setExecutionResult] = useState<any>(
    scene === 'exec_complete' ? { success: true, message: 'La descarga ha finalizado y el contenido está disponible offline.' } : null
  );

  // Sync state with scene changes
  React.useEffect(() => {
    if (scene === 'auth_success') {
      setAuthStatus({ isAuthenticated: true, message: 'Handshake completado con éxito.', checked: true });
      setExecutionResult(null);
      setTaskProgress(null);
    } else if (scene === 'auth_error') {
      setAuthStatus({ isAuthenticated: false, message: 'La sesión ha expirado o no existe.', checked: true });
      setExecutionResult(null);
      setTaskProgress(null);
    } else if (scene === 'auth_checking') {
      setAuthStatus({ isAuthenticated: false, message: '', checked: false });
      setExecutionResult(null);
      setTaskProgress(null);
    } else if (scene === 'exec_running') {
      setAuthStatus({ isAuthenticated: true, message: 'Autenticado', checked: true });
      setTaskProgress({ step: 'Descargando Video: Introducción a OCI...', status: 'Sincronizando' });
      setExecutionResult(null);
    } else if (scene === 'exec_complete') {
      setAuthStatus({ isAuthenticated: true, message: 'Autenticado', checked: true });
      setTaskProgress(null);
      setExecutionResult({ success: true, message: 'La descarga ha finalizado y el contenido está disponible offline.' });
    } else if (scene === 'exec_ready') {
      setAuthStatus({ isAuthenticated: true, message: 'Autenticado', checked: true });
      setTaskProgress(null);
      setExecutionResult(null);
    } else {
      setAuthStatus({ isAuthenticated: false, message: '', checked: false });
      setExecutionResult(null);
      setTaskProgress(null);
    }
  }, [scene]);

  const scenes: { id: SceneId; label: string; group: string }[] = [
    { id: 'selection_empty', label: 'Vacío', group: 'Selección' },
    { id: 'selection_populated', label: 'Con Items', group: 'Selección' },
    { id: 'selection_scroll', label: 'Con Scroll', group: 'Selección' },
    { id: 'auth_checking', label: 'Verificando', group: 'Sesión' },
    { id: 'auth_success', label: 'Éxito', group: 'Sesión' },
    { id: 'auth_error', label: 'Error', group: 'Sesión' },
    { id: 'exec_ready', label: 'Listo', group: 'Ejecución' },
    { id: 'exec_running', label: 'Corriendo', group: 'Ejecución' },
    { id: 'exec_complete', label: 'Finalizado', group: 'Ejecución' },
  ];

  const currentStepId = scene.startsWith('selection') ? 'selection' : (scene.startsWith('auth') ? 'auth' : 'execution');

  return (
    <div className="space-y-10">
      {/* Scene Selector */}
      <div className="flex flex-wrap gap-4 p-6 bg-surface-950/80 backdrop-blur rounded-3xl border border-white/5 sticky top-0 z-50 shadow-xl">
        {['Selección', 'Sesión', 'Ejecución'].map(group => (
          <div key={group} className="space-y-3">
            <div className="text-[9px] font-black text-brand-500/60 uppercase tracking-[0.3em] ml-1">{group}</div>
            <div className="flex gap-2">
              {scenes.filter(s => s.group === group).map(s => (
                <button
                  key={s.id}
                  onClick={() => setScene(s.id)}
                  className={`px-4 py-2 text-[10px] font-bold rounded-xl transition-all border ${scene === s.id ? 'bg-brand-600 border-brand-500 text-white shadow-xl shadow-brand-600/20 translate-y-[-2px]' : 'bg-surface-900 border-border-subtle text-text-muted hover:border-brand-500/50 hover:bg-surface-800'}`}
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

          <AuthStep
            authStatus={authStatus}
            isLoading={scene === 'auth_checking'}
            authLoading={false}
            checkAuth={async () => { setScene('auth_checking'); setTimeout(() => setScene('auth_success'), 1500); return true; }}
            launchLogin={async () => { }}
          />

          <ExecutionStep
            downloadOptions={downloadOptions}
            setDownloadOptions={setDownloadOptions}
            isLoading={scene === 'auth_checking' || scene === 'exec_running'}
            executionResult={executionResult}
            taskProgress={taskProgress}
            selectedItem={selectedItem || mockAvailableContent.courses[0]}
            newUrl={newUrl}
            contentType={contentType}
            startScraping={async () => { setScene('exec_running'); setTimeout(() => setScene('exec_complete'), 3000); }}
            cancelScraping={async () => { setScene('exec_ready'); }}
          />
        </GenericWizard>
      </div>

      {/* States Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-8 bg-surface-950/40 rounded-4xl border border-white/5 space-y-4">
          <div className="w-10 h-10 bg-brand-600/10 text-brand-400 rounded-2xl flex items-center justify-center">
            <Icon name="layers" size="sm" />
          </div>
          <h4 className="font-bold text-text-primary tracking-tight">Step 1: Selection</h4>
          <p className="text-xs text-text-muted leading-relaxed opacity-60">Permite elegir entre reanudar una descarga interrumpida o iniciar una nueva ingresando una URL de Oracle University.</p>
        </div>
        <div className="p-8 bg-surface-950/40 rounded-4xl border border-white/5 space-y-4">
          <div className="w-10 h-10 bg-brand-600/10 text-brand-400 rounded-2xl flex items-center justify-center">
            <Icon name="lock" size="sm" />
          </div>
          <h4 className="font-bold text-text-primary tracking-tight">Step 2: Authentication</h4>
          <p className="text-xs text-text-muted leading-relaxed opacity-60">Valida la sesión mediante el ScraperService. Si falla, ofrece abrir un navegador controlado para realizar el login interactivo.</p>
        </div>
        <div className="p-8 bg-surface-950/40 rounded-4xl border border-white/5 space-y-4">
          <div className="w-10 h-10 bg-brand-600/10 text-brand-400 rounded-2xl flex items-center justify-center">
            <Icon name="play" size="sm" />
          </div>
          <h4 className="font-bold text-text-primary tracking-tight">Step 3: Execution</h4>
          <p className="text-xs text-text-muted leading-relaxed opacity-60">Controla la ejecución del proceso, mostrando logs en tiempo real y permitiendo seleccionar qué activos descargar (Videos/PDFs).</p>
        </div>
      </div>
    </div>
  );
};
