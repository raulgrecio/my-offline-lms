import React from 'react';

import { Icon } from '@web/components/Icon';
import { useWizard } from '@web/components/Wizard/WizardContext';
import { WizardActionButtons } from '@web/components/Wizard/WizardActionButtons';

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

interface SelectionStepProps {
  availableContent: { courses: ContentItem[], paths: any[] };
  selectedItem: ContentItem | null;
  setSelectedItem: (item: ContentItem | null) => void;
  newUrl: string;
  setNewUrl: (url: string) => void;
  contentType: 'course' | 'path';
  setContentType: (type: 'course' | 'path') => void;
}


export const SelectionStep: React.FC<SelectionStepProps> = ({
  availableContent,
  selectedItem,
  setSelectedItem,
  newUrl,
  setNewUrl,
  contentType,
  setContentType
}) => {
  const { setCanProceed } = useWizard();

  React.useEffect(() => {
    setCanProceed(!!newUrl || !!selectedItem);
  }, [newUrl, selectedItem, setCanProceed]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* ... (contents the same) ... */}
        <div className={`p-8 bg-surface-800 rounded-3xl border flex flex-col group transition-all duration-300 ${newUrl ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-900/5' : 'border-border-subtle hover:border-brand-500/50'}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${newUrl ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' : 'bg-brand-600/10 text-brand-500'}`}>
            <Icon name="plus" size="md" />
          </div>
          <h3 className="text-lg font-bold mb-2 text-text-primary">Nuevo Contenido</h3>
          <p className="text-[11px] text-text-muted mb-6 leading-relaxed">Ingresa una URL de Oracle University para sincronizar nuevos metadatos y assets.</p>

          <div className="space-y-4 mb-auto">
            <div className="relative">
              <input
                type="text"
                placeholder="https://mylearn.oracle.com/ou/course/..."
                className="w-full bg-surface-900 border border-border-subtle rounded-xl px-4 py-3.5 text-xs focus:border-brand-500 outline-none transition-all placeholder:text-text-muted/30 text-text-primary"
                value={newUrl}
                onChange={(e) => {
                  setNewUrl(e.target.value);
                  setSelectedItem(null);
                }}
              />
            </div>
            <div className="flex gap-2 p-1 bg-surface-950 rounded-xl border border-border-subtle">
              <button
                onClick={() => setContentType('course')}
                className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-lg transition-all ${contentType === 'course' ? 'bg-surface-800 text-brand-400 shadow-sm' : 'text-text-muted hover:text-brand-500'}`}
              >Curso</button>
              <button
                onClick={() => setContentType('path')}
                className={`flex-1 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-lg transition-all ${contentType === 'path' ? 'bg-surface-800 text-brand-400 shadow-sm' : 'text-text-muted hover:text-brand-500'}`}
              >Learning Path</button>
            </div>
          </div>
        </div>

        <div className={`flex flex-col p-8 bg-surface-800 rounded-3xl border group transition-all duration-300 ${selectedItem ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-900/5' : 'border-border-subtle hover:border-brand-500/50'}`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${selectedItem ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' : 'bg-brand-600/10 text-brand-500'}`}>
            <Icon name="rotate-cw" size="md" />
          </div>
          <h3 className="text-lg font-bold mb-2 text-text-primary">Contenido Pendiente</h3>
          <p className="text-[11px] text-text-muted mb-6 leading-relaxed">Continúa con las descargas de cursos o rutas previamente detectados.</p>

          <div className="flex-1 overflow-y-auto max-h-[220px] space-y-2 pr-2 custom-scrollbar">
            {availableContent.courses.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-text-muted text-sm italic opacity-30">
                <Icon name="inbox" size="lg" className="mb-2" />
                No hay contenido detectado
              </div>
            )}
            {availableContent.courses.filter(c => !c.isComplete).map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedItem(item);
                  setNewUrl('');
                }}
                className={`w-full text-left p-4 rounded-xl border transition-all relative overflow-hidden group/item ${selectedItem?.id === item.id ? 'bg-brand-600/15 border-brand-500/50' : 'bg-surface-900 border-border-subtle hover:border-brand-400/50'}`}
              >
                <div className="font-bold text-[11px] truncate mb-2 group-hover/item:text-brand-400 transition-colors text-text-primary">{item.title}</div>
                <div className="flex items-center gap-4 text-[9px] font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted">Videos:</span>
                    <span className="text-brand-400 font-bold">{item.downloadedVideos}/{item.totalVideos}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted">Guías:</span>
                    <span className="text-brand-400 font-bold">{item.downloadedGuides}/{item.totalGuides}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <WizardActionButtons nextLabel="Continuar a Sesión" />
    </div>
  );
};
