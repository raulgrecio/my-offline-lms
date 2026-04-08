import React from 'react';
import { Icon } from '@web/components/Icon';
import { Button } from '@web/components/Button';
import type { ScraperTaskCategory } from '@scraper/features/task-management';
import type { UITheme } from '../steps/_SelectionStep';

interface ContentTypeFilterProps {
  contentType: ScraperTaskCategory;
  setContentType: (type: ScraperTaskCategory) => void;
  onTypeChange?: () => void;
  themes: Record<ScraperTaskCategory, UITheme>;
}

export const ContentTypeFilter: React.FC<ContentTypeFilterProps> = ({
  contentType,
  setContentType,
  onTypeChange,
  themes
}) => {
  const handleTypeChange = (type: ScraperTaskCategory) => {
    if (type !== contentType) {
      setContentType(type);
      onTypeChange?.();
    }
  };

  return (
    <div className="flex justify-center mb-8">
      <div className="flex gap-2 p-1.5 bg-surface-950 rounded-2xl border border-border-subtle/50 w-full max-w-sm shadow-xl">
        <Button
          variant="none"
          onClick={() => handleTypeChange('course')}
          className={`flex-1 py-2.5 text-[10px] uppercase tracking-widest font-black rounded-xl transition-all duration-300 ${contentType === 'course'
              ? `${themes.course.activeBg} text-white shadow-lg ${themes.course.activeShadow} ring-1 ${themes.course.ring}`
              : `text-text-muted hover:${themes.course.primary} ${themes.course.hoverBg}`
            }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Icon name="book-open" size="xs" />
            Cursos
          </div>
        </Button>
        <Button
          variant="none"
          onClick={() => handleTypeChange('path')}
          className={`flex-1 py-2.5 text-[10px] uppercase tracking-widest font-black rounded-xl transition-all duration-300 ${contentType === 'path'
              ? `${themes.path.activeBg} text-white shadow-lg ${themes.path.activeShadow} ring-1 ${themes.path.ring}`
              : `text-text-muted hover:${themes.path.primary} ${themes.path.hoverBg}`
            }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Icon name="graduation-cap" size="xs" />
            Learning Paths
          </div>
        </Button>
      </div>
    </div>
  );
};
