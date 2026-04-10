import { type ScraperTaskCategoryType } from '@scraper/features/task-management/domain/models/ScraperTask';

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

export const THEMES: Record<ScraperTaskCategoryType, UITheme> = {
  course: {
    primary: 'brand-500',
    activeBg: 'bg-brand-600',
    activeBorder: 'border-brand-500/50',
    activeShadow: 'shadow-md shadow-brand-500/25',
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
    activeShadow: 'shadow-md shadow-amber-500/25',
    hoverBg: 'hover:bg-amber-500/5',
    hoverText: 'group-hover/item:text-amber-400',
    indicator: 'bg-amber-500/50',
    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    ring: 'ring-amber-400/20'
  }
};
