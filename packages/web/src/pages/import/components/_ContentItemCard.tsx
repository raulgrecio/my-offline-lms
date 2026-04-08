import React from 'react';
import { Icon } from '@web/components/Icon';
import { ScraperTaskCategory } from '@scraper/features/task-management';
import type { UITheme } from '../steps/_SelectionStep';

export interface ContentItem {
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
  category: ScraperTaskCategory;
}

interface ContentItemCardProps {
  item: ContentItem;
  isSelected: boolean;
  onClick: () => void;
  theme: UITheme;
}

export const ContentItemCard: React.FC<ContentItemCardProps> = ({ item, isSelected, onClick, theme }) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    }}
    aria-pressed={isSelected}
    className={`w-full text-left p-4 rounded-xl border transition-all relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand-500 overflow-hidden group/item ${isSelected
      ? `${theme?.activeBg}/15 ${theme?.activeBorder} ${theme?.activeShadow?.replace('shadow-', 'shadow-[0_0_20px_-5px_')}`
      : `bg-surface-900 border-border-subtle hover:bg-surface-800 ${theme?.activeBorder?.replace('border-', 'hover:border-')?.replace('/50', '/50') || ''}`
      }`}
  >
    {/* Background indicator for type */}
    <div className={`absolute top-0 left-0 w-1 h-full ${isSelected ? theme.indicator : ''}`} />

    <div className="flex justify-between items-start mb-1">
      <div className={`font-bold text-[11px] truncate flex-1 transition-colors text-text-primary ${theme.hoverText}`}>
        {item.title}
      </div>
      <div className={`ml-2 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-tighter font-black ${theme.badge}`}>
        {item.category === ScraperTaskCategory.PATH ? 'Path' : 'Course'}
      </div>
    </div>

    <div className="text-[9px] text-text-muted mb-3 truncate font-mono opacity-50 group-hover/item:opacity-80 transition-opacity">
      {item.url}
    </div>

    <div className="flex items-center gap-4 text-[9px] font-mono font-bold tracking-tight">
      <div className="flex items-center gap-1.5">
        <Icon name="play" size="xs" className="opacity-40" />
        <span className="text-text-muted font-medium">Videos:</span>
        <span className={item.downloadedVideos === item.totalVideos
          ? 'text-green-400'
          : (theme.hoverText.includes(':') ? theme.hoverText.split(':')[1] : theme.hoverText)}>
          {item.downloadedVideos}/{item.totalVideos}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Icon name="file-text" size="xs" className="opacity-40" />
        <span className="text-text-muted font-medium">Guías:</span>
        <span className={item.downloadedGuides === item.totalGuides
          ? 'text-green-400'
          : (theme.hoverText.includes(':') ? theme.hoverText.split(':')[1] : theme.hoverText)}>
          {item.downloadedGuides}/{item.totalGuides}
        </span>
      </div>
    </div>

    {/* Progress bar subtle indicator */}
    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-surface-950">
      <div
        className={`h-full transition-all duration-500 ${theme.indicator.replace('/50', '/40')}`}
        style={{ width: `${((item.downloadedVideos + item.downloadedGuides) / (item.totalVideos + item.totalGuides)) * 100}%` }}
      />
    </div>
  </div>
);
