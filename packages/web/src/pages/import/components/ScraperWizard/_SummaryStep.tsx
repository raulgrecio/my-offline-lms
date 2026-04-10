import React from 'react';

import { ScraperTaskCategory, type ScraperTaskCategoryType } from '@scraper/features/task-management/domain/models/ScraperTask';

import { Icon } from '@web/components/Icon';
import { Button } from '@web/components/Button';
import { useWizard } from '@web/components/Wizard/WizardContext';
import { WizardActionButtons } from '@web/components/Wizard/WizardActionButtons';

import { THEMES } from '../_category-themes';

interface SummaryStepProps {
  isLoading: boolean;
  executionResult: { success: boolean; message: string } | null;
  selectedItem: any;
  newUrl: string;
  contentType: ScraperTaskCategoryType;
  downloadOptions: { videos: boolean; guides: boolean };
  startScraping: () => Promise<void>;
}

export const SummaryStep: React.FC<SummaryStepProps> = ({
  isLoading,
  executionResult,
  selectedItem,
  newUrl,
  contentType,
  downloadOptions,
  startScraping,
}) => {
  const { setCanProceed, goTo } = useWizard();
  const currentTheme = THEMES[contentType];

  React.useEffect(() => {
    // We can proceed if there's no result yet or if it failed
    setCanProceed(!executionResult?.success);
  }, [executionResult, setCanProceed]);

  if (executionResult?.success) {
    return (
      <div className="py-12 flex flex-col items-center text-center space-y-8 animate-in zoom-in duration-500">
        <div className={`w-24 h-24 rounded-full text-white flex items-center justify-center shadow-2xl ${currentTheme.activeBg} ${currentTheme.activeShadow}`}>
          <Icon name="check" size="lg" />
        </div>
        <div className="space-y-3 px-4">
          <h3 className="text-2xl font-bold text-text-primary tracking-tight font-display">¡Todo listo!</h3>
          <p className="text-sm text-text-muted max-w-sm mx-auto leading-relaxed">
            Tarea registrada correctamente. Ya puedes iniciarla desde tu panel de tareas.
          </p>
        </div>
        <div className="flex gap-4">
          <Button
            variant="primary"
            onClick={() => {
              // Reset wizard to first step
              goTo(0);
            }}
          >
            Nueva Importación
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h4 className="text-2xs font-black text-text-muted uppercase mb-4 tracking-[0.3em] opacity-50 text-center">Confirmación Final</h4>

          <div className="relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Icon name={selectedItem?.type || (contentType === ScraperTaskCategory.COURSE ? 'book-open' : 'layers')} size="xl" />
            </div>

            <div className="space-y-6 relative z-10">
              <div className="space-y-1">
                <div className={`text-2xs font-black uppercase tracking-[0.3em] opacity-60 ${currentTheme.hoverText}`}>Destino</div>
                <div className="text-xl font-bold text-text-primary tracking-tight leading-tight">{selectedItem?.title || (newUrl ? 'Nuevo Curso Detectado' : 'Sin Selección')}</div>
              </div>

              <div className="space-y-3">
                <div className={`text-2xs font-black uppercase tracking-[0.3em] opacity-60 ${currentTheme.hoverText}`}>URL de Sincronización</div>
                <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                  <Icon name="link" size="xs" className="text-text-muted" />
                  <div className="text-xs text-text-muted font-mono">{selectedItem?.url || newUrl}</div>
                </div>
              </div>

              <div className="pt-6 flex items-center justify-center gap-12 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${downloadOptions.videos ? 'bg-status-completed shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-surface-700'}`} />
                  <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Videos</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${downloadOptions.guides ? 'bg-status-completed shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-surface-700'}`} />
                  <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Guías</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {executionResult && !executionResult.success && (
        <div className="p-4 bg-status-failed/10 border border-status-failed/20 rounded-2xl text-status-failed text-xs text-center animate-in shake duration-500">
          {executionResult.message}
        </div>
      )}

      <WizardActionButtons nextLabel="Finalizar"
        onNext={startScraping} />
    </div>
  );
};
