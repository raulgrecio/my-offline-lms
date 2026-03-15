export type SubtitleMode = 'custom' | 'native';

export interface PlayerSettingsProps {
  subtitleMode: SubtitleMode;
  onChangeSubtitleMode: (mode: SubtitleMode) => void;
}

export default function PlayerSettings({ subtitleMode, onChangeSubtitleMode }: PlayerSettingsProps) {
  return (
    <div
      className="absolute bottom-full right-4 mb-4 p-3 rounded-xl bg-black/85 backdrop-blur-md border border-white/10 shadow-2xl flex flex-col gap-3 min-w-[180px] z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-1">Subtítulos</div>
      <div className="flex flex-col gap-1">
        <button
          onClick={() => onChangeSubtitleMode('custom')}
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${subtitleMode === 'custom' ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/5'
            }`}
        >
          Personalizados
          {subtitleMode === 'custom' && (
            <div className="w-1.5 h-1.5 rounded-full bg-[#f83b20] shadow-[0_0_8px_rgba(248,59,32,0.8)]" />
          )}
        </button>
        <button
          onClick={() => onChangeSubtitleMode('native')}
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${subtitleMode === 'native' ? 'bg-white/15 text-white' : 'text-white/60 hover:bg-white/5'
            }`}
        >
          Nativos
          {subtitleMode === 'native' && (
            <div className="w-1.5 h-1.5 rounded-full bg-[#f83b20] shadow-[0_0_8px_rgba(248,59,32,0.8)]" />
          )}
        </button>
      </div>
    </div>
  );
}
