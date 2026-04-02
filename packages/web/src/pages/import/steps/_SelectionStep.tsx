import React, { useMemo } from 'react';
import { Icon } from '@web/components/Icon';
import { Button } from '@web/components/Button';
import { useWizard } from '@web/components/Wizard/WizardContext';
import { WizardActionButtons } from '@web/components/Wizard/WizardActionButtons';
import type { ScraperTaskType } from '@scraper/features/task-management';
import { ContentItemCard, type ContentItem } from '../components/_ContentItemCard';
import { ContentTypeFilter } from '../components/_ContentTypeFilter';
import { SelectionCard } from '../components/_SelectionCard';

interface SelectionStepProps {
  availableContent: {
    courses: ContentItem[],
    paths: ContentItem[]
  };
  selectedItem: ContentItem | null;
  setSelectedItem: (item: ContentItem | null) => void;
  newUrl: string;
  setNewUrl: (url: string) => void;
  contentType: ScraperTaskType;
  setContentType: (type: ScraperTaskType) => void;
}

const PLACEHOLDERS = {
  course: 'https://mylearn.database.com/ou/course/...',
  path: 'https://mylearn.database.com/ou/learning-path/...'
};

// Centralized Theme System
export interface UITheme {
  primary: string;
  activeBg: string;
  activeBorder: string;
  activeShadow: string;
  hoverBg: string;
  hoverText: string;
  indicator: string;
  badge: string;
  ring: string;
}

export const THEMES: Record<ScraperTaskType, UITheme> = {
  course: {
    primary: 'brand-500',
    activeBg: 'bg-brand-600',
    activeBorder: 'border-brand-500/50',
    activeShadow: 'shadow-[0_0_20px_-5px_rgba(var(--color-brand-500-rgb),0.2)]',
    hoverBg: 'hover:bg-brand-500/5',
    hoverText: 'group-hover/item:text-brand-400',
    indicator: 'bg-brand-500/50',
    badge: 'bg-brand-500/10 text-brand-500 border-brand-500/20',
    ring: 'ring-brand-400/20'
  },
  path: {
    primary: 'amber-500',
    activeBg: 'bg-amber-500',
    activeBorder: 'border-amber-500/50',
    activeShadow: 'shadow-[0_0_20px_-5px_rgba(245,158,11,0.2)]',
    hoverBg: 'hover:bg-amber-500/5',
    hoverText: 'group-hover/item:text-amber-400',
    indicator: 'bg-amber-500/50',
    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    ring: 'ring-amber-400/20'
  }
};

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

  const filteredPending = useMemo(() => {
    const list = contentType === 'course' ? availableContent.courses : availableContent.paths;
    return list.filter(c => !c.isComplete);
  }, [availableContent, contentType]);

  React.useEffect(() => {
    setCanProceed(!!newUrl || !!selectedItem);
  }, [newUrl, selectedItem, setCanProceed]);

  const currentTheme = THEMES[contentType];

  return (
    <div className="space-y-6">
      {/* Global Type Filter */}
      <ContentTypeFilter 
        contentType={contentType} 
        setContentType={setContentType} 
        onTypeChange={() => setSelectedItem(null)}
        themes={THEMES}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* NEW CONTENT CARD */}
        <SelectionCard
          icon="plus"
          title={`Nuevo ${contentType === 'course' ? 'Curso' : 'Path'}`}
          description="Ingresa una URL de Oracle University para sincronizar nuevos metadatos y assets."
          isActive={!!newUrl}
          theme={currentTheme}
        >
          <div className="space-y-4 mb-auto">
            <div className="relative">
              <input
                type="text"
                placeholder={contentType === 'course' ? PLACEHOLDERS.course : PLACEHOLDERS.path}
                className={`w-full bg-surface-900 border border-border-subtle rounded-xl px-4 py-3.5 text-xs outline-none transition-all placeholder:text-text-muted/30 text-text-primary focus:ring-1 ${contentType === 'path' ? 'focus:border-amber-500 focus:ring-amber-500' : 'focus:border-brand-500 focus:ring-brand-500'
                  }`}
                value={newUrl}
                onChange={(e) => {
                  setNewUrl(e.target.value);
                  setSelectedItem(null);
                }}
              />
            </div>
          </div>
        </SelectionCard>

        {/* PENDING CONTENT CARD */}
        <SelectionCard
          icon="rotate-cw"
          title="Contenido Pendiente"
          description={`Continúa con las descargas de ${contentType === 'course' ? 'cursos' : 'rutas'} previamente detectados.`}
          isActive={!!selectedItem}
          theme={currentTheme}
        >
          <div className="flex-1 overflow-y-auto max-h-[220px] custom-scrollbar -mx-[10px] px-[10px]">
            <ul className="space-y-3 list-none pr-2">
              {filteredPending.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-text-muted text-xs italic opacity-40">
                  <Icon name="inbox" size="lg" className="mb-2" />
                  No hay {contentType === 'course' ? 'cursos' : 'learning paths'} detectados
                </div>
              )}
              {filteredPending.map(item => (
                <li key={item.id} className="animate-in fade-in slide-in-from-right-2 duration-300">
                  <ContentItemCard
                    item={item}
                    isSelected={selectedItem?.id === item.id}
                    onClick={() => {
                      setSelectedItem(item);
                      setNewUrl('');
                    }}
                    theme={THEMES[item.type]}
                  />
                </li>
              ))}
            </ul>
          </div>
        </SelectionCard>
      </div>

      <WizardActionButtons nextLabel="Continuar a Sesión" />
    </div>
  );
};
