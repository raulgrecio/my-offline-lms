export type SubtitleMode = 'custom' | 'native';

export interface PlayerSettingsProps {
  subtitleMode: SubtitleMode;
  onChangeSubtitleMode: (mode: SubtitleMode) => void;
}

export default function PlayerSettings({ subtitleMode, onChangeSubtitleMode }: PlayerSettingsProps) {
  return (
    <div
      className="absolute bottom-full right-4 mb-4 p-3 rounded-xl shadow-2xl flex flex-col gap-3 min-w-[180px] z-50"
      style={{
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--shadow-custom)'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest px-1" style={{ color: 'var(--text-primary)' }}>Subtítulos</div>
      <div className="flex flex-col gap-1">
        <button
          onClick={() => onChangeSubtitleMode('custom')}
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: subtitleMode === 'custom' ? 'var(--bg-surface-active)' : 'transparent',
            color: subtitleMode === 'custom' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}
        >
          Personalizados
          {subtitleMode === 'custom' && (
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-500)] shadow-[0_0_8px_var(--color-brand-500)]" />
          )}
        </button>
        <button
          onClick={() => onChangeSubtitleMode('native')}
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: subtitleMode === 'native' ? 'var(--bg-surface-active)' : 'transparent',
            color: subtitleMode === 'native' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}
        >
          Nativos
          {subtitleMode === 'native' && (
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-brand-500)] shadow-[0_0_8px_var(--color-brand-500)]" />
          )}
        </button>
      </div>
    </div>
  );
}
