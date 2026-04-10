import React from 'react';
import { Icon } from '@web/components/Icon';
import { Button } from '@web/components/Button';
import { WizardActionButtons } from '@web/components/Wizard/WizardActionButtons';
import { THEMES } from '../_category-themes';
import { type ScraperTaskCategoryType } from '@scraper/features/task-management/domain/models/ScraperTask';

interface AssetSelectionStepProps {
  contentType: ScraperTaskCategoryType;
  downloadOptions: { videos: boolean; guides: boolean };
  onToggleVideo: () => void;
  onToggleGuide: () => void;
}

export const AssetSelectionStep: React.FC<AssetSelectionStepProps> = ({
  contentType,
  downloadOptions,
  onToggleVideo,
  onToggleGuide,
}) => {
  const currentTheme = THEMES[contentType];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h4 className="text-2xs font-black text-text-muted uppercase mb-4 tracking-[0.3em] opacity-50 text-center">Configuraciones de Descarga</h4>
          <p className="text-xs text-text-muted mb-6 leading-relaxed text-center">
            Selecciona qué elementos adicionales quieres sincronizar. Los metadatos del curso siempre se descargarán.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              variant="none"
              onClick={onToggleVideo}
              className={`flex items-center justify-between p-6 rounded-3xl border transition-all duration-300 w-full ${downloadOptions.videos ? `${currentTheme.activeBg}/10 ${currentTheme.activeBorder} ${currentTheme.activeShadow}` : 'bg-surface-900 border-border-subtle opacity-40 grayscale group-hover:grayscale-0'}`}
            >
              <div className="flex items-center gap-5">
                <div className={`p-3 rounded-2xl ${downloadOptions.videos ? `${currentTheme.activeBg} text-white shadow-lg` : 'bg-surface-800 text-text-muted'}`}>
                  <Icon name="play" size="sm" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-sm tracking-tight text-text-primary">Videos mp4</div>
                  <div className="text-2xs opacity-60 font-mono mt-1 uppercase tracking-tighter">Native Platform Format</div>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${downloadOptions.videos ? `${currentTheme.activeBorder} ${currentTheme.activeBg}/10` : 'border-border-subtle'}`}>
                {downloadOptions.videos && <div className={`w-2.5 h-2.5 rounded-full ${currentTheme.activeBg} animate-in zoom-in`} ></div>}
              </div>
            </Button>

            <Button
              variant="none"
              onClick={onToggleGuide}
              className={`flex items-center justify-between p-6 rounded-3xl border transition-all duration-300 w-full ${downloadOptions.guides ? `${currentTheme.activeBg}/10 ${currentTheme.activeBorder} ${currentTheme.activeShadow}` : 'bg-surface-900 border-border-subtle opacity-40 grayscale group-hover:grayscale-0'}`}
            >
              <div className="flex items-center gap-5">
                <div className={`p-3 rounded-2xl ${downloadOptions.guides ? `${currentTheme.activeBg} text-white shadow-lg` : 'bg-surface-800 text-text-muted'}`}>
                  <Icon name="file-text" size="sm" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-sm tracking-tight text-text-primary">PDF Guides</div>
                  <div className="text-2xs opacity-60 font-mono mt-1 uppercase tracking-tighter text-text-muted">Guide conversion</div>
                </div>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${downloadOptions.guides ? `${currentTheme.activeBorder} ${currentTheme.activeBg}/10` : 'border-border-subtle'}`}>
                {downloadOptions.guides && <div className={`w-2.5 h-2.5 rounded-full ${currentTheme.activeBg} animate-in zoom-in`} ></div>}
              </div>
            </Button>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-status-info/5 border border-status-info/10 flex items-start gap-4">
          <div className="p-2 rounded-lg bg-status-info/10 text-status-info">
            <Icon name="alert-circle" size="xs" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-text-primary">Nota sobre el tiempo</p>
            <p className="text-xs text-text-muted leading-tight">
              La sincronización de vídeos puede tardar significativamente dependiendo del tamaño del contenido y tu conexión a internet.
            </p>
          </div>
        </div>
      </div>

      <WizardActionButtons nextLabel="Continuar" />
    </div>
  );
};
