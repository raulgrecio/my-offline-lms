import React from 'react';

import { Icon } from '@web/components/Icon';
import { Button } from '@web/components/Button';
import { useWizard } from '@web/components/Wizard/WizardContext';
import { WizardActionButtons } from '@web/components/Wizard/WizardActionButtons';

interface ExecutionStepProps {
  downloadOptions: { videos: boolean; guides: boolean };
  onToggleVideo: () => void;
  onToggleGuide: () => void;
  includeDownload: boolean;
  onToggleIncludeDownload: () => void;
  isLoading: boolean;
  executionResult: { success: boolean; message: string } | null;
  taskProgress: { step: string, status?: string } | null;
  selectedItem: any;
  newUrl: string;
  contentType: string;
  startScraping: () => Promise<void>;
  cancelScraping: () => Promise<void>;
}

export const ExecutionStep: React.FC<ExecutionStepProps> = ({
  downloadOptions,
  onToggleVideo,
  onToggleGuide,
  includeDownload,
  onToggleIncludeDownload,
  isLoading,
  executionResult,
  taskProgress,
  selectedItem,
  newUrl,
  contentType,
  startScraping,
  cancelScraping
}) => {
  const { setCanProceed } = useWizard();

  React.useEffect(() => {
    setCanProceed(!executionResult?.success);
  }, [executionResult, setCanProceed]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 py-6 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="space-y-10">
          <div>
            <h4 className="text-[10px] font-black text-text-muted uppercase mb-6 tracking-[0.3em] opacity-50">Payload & Config</h4>

            {/* Auto-download Toggle */}
            <div className="mb-6">
              <Button
                variant="none"
                onClick={onToggleIncludeDownload}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 w-full ${includeDownload ? 'bg-brand-500/5 border-brand-500/30' : 'bg-surface-900 border-border-subtle opacity-60'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${includeDownload ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' : 'bg-surface-800 text-text-muted'}`}>
                    <Icon name="play" size="xs" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-xs tracking-tight text-text-primary">Descarga Automática</div>
                    <div className="text-[9px] opacity-50 mt-0.5">Iniciar descarga tras sincronizar</div>
                  </div>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-all ${includeDownload ? 'bg-brand-600' : 'bg-surface-800'}`}>
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${includeDownload ? 'right-1' : 'left-1'}`}></div>
                </div>
              </Button>
            </div>

            <div className={`grid grid-cols-1 gap-4 transition-all duration-500 ${!includeDownload ? 'opacity-20 pointer-events-none blur-sm scale-95' : ''}`}>
              <Button
                variant="none"
                onClick={onToggleVideo}
                className={`flex items-center justify-between p-6 rounded-3xl border transition-all duration-300 w-full ${downloadOptions.videos ? 'bg-brand-900/10 border-brand-500 shadow-xl shadow-brand-500/5' : 'bg-surface-900 border-border-subtle opacity-40 grayscale group-hover:grayscale-0'}`}
              >
                <div className="flex items-center gap-5">
                  <div className={`p-3 rounded-2xl ${downloadOptions.videos ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'bg-surface-800 text-text-muted'}`}>
                    <Icon name="play" size="sm" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm tracking-tight text-text-primary">Videos mp4</div>
                    <div className="text-[10px] opacity-60 font-mono mt-1 uppercase tracking-tighter">Native Platform Format</div>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${downloadOptions.videos ? 'border-brand-500 bg-brand-500/10' : 'border-border-subtle'}`}>
                  {downloadOptions.videos && <div className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-in zoom-in" ></div>}
                </div>
              </Button>

              <Button
                variant="none"
                onClick={onToggleGuide}
                className={`flex items-center justify-between p-6 rounded-3xl border transition-all duration-300 w-full ${downloadOptions.guides ? 'bg-brand-900/10 border-brand-500 shadow-xl shadow-brand-500/5' : 'bg-surface-900 border-border-subtle opacity-40 grayscale group-hover:grayscale-0'}`}
              >
                <div className="flex items-center gap-5">
                  <div className={`p-3 rounded-2xl ${downloadOptions.guides ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30' : 'bg-surface-800 text-text-muted'}`}>
                    <Icon name="file-text" size="sm" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm tracking-tight text-text-primary">PDF Guides</div>
                    <div className="text-[10px] opacity-60 font-mono mt-1 uppercase tracking-tighter text-text-muted">Oracle Guide conversion</div>
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${downloadOptions.guides ? 'border-brand-500 bg-brand-500/10' : 'border-border-subtle'}`}>
                  {downloadOptions.guides && <div className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-in zoom-in" ></div>}
                </div>
              </Button>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-surface-900 border border-border-subtle relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Icon name={selectedItem?.type || (contentType === 'course' ? 'book-open' : 'layers')} size="xl" />
            </div>
            <div className="text-[10px] font-black text-brand-500/60 mb-6 uppercase tracking-[0.3em]">Job Metadata</div>
            <div className="space-y-3 relative z-10">
              <div className="text-base font-bold text-text-primary tracking-tight leading-tight">{selectedItem?.title || (newUrl ? 'Nuevo Contenido Detectado' : 'Sin Selección')}</div>
              <div className="bg-black/20 p-3 rounded-xl border border-white/5 flex items-center gap-3">
                <Icon name="link" size="xs" className="text-text-muted" />
                <div className="text-[10px] text-text-muted font-mono truncate">{selectedItem?.url || newUrl}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col bg-surface-950 rounded-5xl border border-border-subtle overflow-hidden relative shadow-2xl group/console">
          <div className="p-5 border-b border-border-subtle flex items-center justify-between bg-surface-900/50 backdrop-blur-2xl">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/30 border border-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/30 border border-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/30 border border-green-500/50" />
            </div>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em] opacity-40">System Core v4</span>
          </div>

          <div
            className="
              flex-1 flex flex-col items-center justify-center
              p-12 text-center
              bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--brand-900)_5%,transparent)_0%,transparent_100%)]
            "
          >
            {isLoading || taskProgress ? (
              <div className="space-y-6 w-full max-w-xs">
                <div className="w-16 h-16 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin mx-auto shadow-xl shadow-brand-500/20"></div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono font-bold text-brand-500 tracking-widest uppercase animate-pulse">
                      {taskProgress ? (taskProgress.status || 'Ejecutando') : 'Iniciando Reactor'}
                    </p>
                    <p className="text-[11px] font-bold text-text-primary uppercase tracking-tight">
                      {taskProgress?.step || 'Preparando clusters de scraping...'}
                    </p>
                  </div>

                  {!executionResult && (
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={cancelScraping}
                      className="mt-4 font-black uppercase tracking-widest px-4"
                    >
                      Cancelar Descarga
                    </Button>
                  )}
                </div>
              </div>
            ) : executionResult ? (
              <div className="space-y-6 animate-in zoom-in duration-700">
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto rotate-3 group-hover/console:rotate-0 transition-transform ${executionResult.success ? 'bg-green-500 text-white shadow-2xl shadow-green-600/30' : 'bg-red-500 text-white shadow-2xl shadow-red-600/30'}`}>
                  <Icon name={executionResult.success ? "check" : "x"} size="lg" />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-black tracking-tight text-text-primary">{executionResult.success ? 'Proceso Finalizado' : 'Fallo Crítico'}</p>
                  <p className="text-xs text-text-muted px-4 leading-relaxed opacity-60">
                    {executionResult.message}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 group/placeholder">
                <div className="w-20 h-20 rounded-4xl bg-surface-900 border border-border-subtle flex items-center justify-center text-text-muted opacity-20 mb-4 group-hover/placeholder:opacity-50 group-hover/placeholder:scale-110 transition-all duration-700">
                  <Icon name="terminal" size="lg" />
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-mono font-bold text-text-muted uppercase tracking-[0.4em] opacity-30">Esperando handshake</p>
                  <p className="text-[8px] font-mono text-text-muted opacity-20 uppercase tracking-tighter">Estado inactivo / Socket listo</p>
                </div>
              </div>
            )}
          </div>

          {executionResult?.success && (
            <div className="p-6 bg-brand-600 hover:bg-brand-500 text-center transition-all animate-in slide-in-from-bottom-full duration-700 group/footer">
              <a href="/" className="text-xs font-black text-white flex items-center justify-center gap-3 uppercase tracking-widest no-underline">
                Ir a mi Biblioteca Offline <Icon name="chevron-right" size="xs" className="group-hover/footer:translate-x-2 transition-transform" />
              </a>
            </div>
          )}
        </div>
      </div>

      <WizardActionButtons
        nextLabel="Crear Tarea de Sincronización"
        onNext={startScraping}
        hideNext={!!executionResult?.success}
      />
    </div>
  );
};
