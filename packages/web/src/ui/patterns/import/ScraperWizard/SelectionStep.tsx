import React, { useMemo } from 'react';

import { ScraperTaskCategory, type ScraperTaskCategoryType } from '@scraper/features/task-management/domain/models/ScraperTask';

import { Icon } from '@web/ui/primitives/Icon';
import { useWizard } from '@web/ui/modules/wizard/WizardContext';
import { WizardActionButtons } from '@web/ui/modules/wizard/WizardActionButtons';

import { ContentItemCard, type ContentItem } from '../ContentItemCard';
import { ContentTypeFilter } from '../ContentTypeFilter';
import { SelectionCard } from '../SelectionCard';
import { THEMES } from '../category-themes';

interface SelectionStepProps {
  availableContent: {
    courses: ContentItem[],
    paths: ContentItem[]
  };
  selectedItem: ContentItem | null;
  setSelectedItem: (item: ContentItem | null) => void;
  newUrl: string;
  setNewUrl: (url: string) => void;
  contentType: ScraperTaskCategoryType;
  setContentType: (type: ScraperTaskCategoryType) => void;
}

const PLACEHOLDERS = {
  course: 'https://mylearn.database.com/ou/course/...',
  path: 'https://mylearn.database.com/ou/learning-path/...'
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
    const list = contentType === ScraperTaskCategory.COURSE ? availableContent.courses : availableContent.paths;
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
          title={`Nuevo ${contentType === ScraperTaskCategory.COURSE ? 'Curso' : 'Path'}`}
          description="Ingresa una URL para sincronizar nuevos metadatos y assets."
          isActive={!!newUrl}
          theme={currentTheme}
        >
          <div className="space-y-4 mb-auto">
            <div className="relative">
              <input
                type="text"
                placeholder={contentType === ScraperTaskCategory.COURSE ? PLACEHOLDERS.course : PLACEHOLDERS.path}
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
          description={`Continúa con las descargas de ${contentType === ScraperTaskCategory.COURSE ? 'cursos' : 'rutas'} previamente detectados.`}
          isActive={!!selectedItem}
          theme={currentTheme}
        >
          <div className="flex-1 overflow-y-auto max-h-[220px] custom-scrollbar -mx-[10px] px-[10px]">
            <ul className="space-y-3 list-none pr-2">
              {filteredPending.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-text-muted text-xs italic opacity-40">
                  <Icon name="inbox" size="lg" className="mb-2" />
                  No hay {contentType === ScraperTaskCategory.COURSE ? 'cursos' : 'learning paths'} detectados
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
                    theme={currentTheme}
                  />
                </li>
              ))}
            </ul>
          </div>
        </SelectionCard>
      </div>

      <WizardActionButtons nextLabel="Continuar" />
    </div>
  );
};
