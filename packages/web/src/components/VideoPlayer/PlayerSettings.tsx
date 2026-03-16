export type SubtitleMode = 'custom' | 'native';

export interface PlayerSettingsProps {
  subtitleMode: SubtitleMode;
  onChangeSubtitleMode: (mode: SubtitleMode) => void;
}

export default function PlayerSettings({ subtitleMode, onChangeSubtitleMode }: PlayerSettingsProps) {
  return (
    <div
      className="absolute bottom-full right-4 mb-4 p-3 rounded-xl shadow-2xl flex flex-col gap-3 min-w-[180px] z-50 bg-glass-bg backdrop-blur-xl border border-glass-border shadow-custom"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest px-1 text-text-primary">Subtítulos</div>
      <div className="flex flex-col gap-1">
        <button
          onClick={() => onChangeSubtitleMode('custom')}
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            subtitleMode === 'custom' ? 'bg-surface-600 text-text-primary' : 'bg-transparent text-text-secondary'
          }`}
        >
          Personalizados
          {subtitleMode === 'custom' && (
            <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_var(--brand-500)]" />
          )}
        </button>
        <button
          onClick={() => onChangeSubtitleMode('native')}
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            subtitleMode === 'native' ? 'bg-surface-600 text-text-primary' : 'bg-transparent text-text-secondary'
          }`}
        >
          Nativos
          {subtitleMode === 'native' && (
            <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_var(--brand-500)]" />
          )}
        </button>
      </div>
    </div>
  );
}
