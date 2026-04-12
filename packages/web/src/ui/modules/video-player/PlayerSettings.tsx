import { Icon } from '@web/ui/primitives/Icon';

export type SubtitleMode = 'custom' | 'native';

export interface PlayerSettingsProps {
  subtitleMode: SubtitleMode;
  onChangeSubtitleMode: (mode: SubtitleMode) => void;
  subtitleOpacity: number;
  onChangeSubtitleOpacity: (val: number) => void;
  onClose?: () => void;
}

const SettingsContent = ({ 
  subtitleMode, 
  onChangeSubtitleMode,
  subtitleOpacity,
  onChangeSubtitleOpacity
}: Omit<PlayerSettingsProps, 'onClose'>) => (
  <>
    <div className="text-2xs font-bold uppercase tracking-widest px-1 text-white/80">Subtítulos</div>
    <div className="flex flex-col gap-1">
      <button
        onClick={() => onChangeSubtitleMode('custom')}
        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
          subtitleMode === 'custom' ? 'bg-white/10 text-white' : 'bg-transparent text-white/60 hover:bg-white/5'
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
          subtitleMode === 'native' ? 'bg-white/10 text-white' : 'bg-transparent text-white/60 hover:bg-white/5'
        }`}
      >
        Nativos
        {subtitleMode === 'native' && (
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_var(--brand-500)]" />
        )}
      </button>
    </div>
    <div className={`flex flex-col gap-2 p-1 ${ subtitleMode === 'custom' ? 'opacity-100' : 'opacity-20 pointer-events-none'  }`}>
      <div className="h-px bg-white/10 mx-1 my-1"></div>
      <div className="flex flex-col gap-2 p-1">
        <div className="flex items-center justify-between px-2">
          <span className="text-2xs font-bold text-white/40 uppercase tracking-wider">Opacidad</span>
          <span className="text-2xs font-mono text-brand-500">{Math.round(subtitleOpacity * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={subtitleOpacity}
          onChange={(e) => onChangeSubtitleOpacity(parseFloat(e.target.value))}
          className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-500"
        />
      </div>
    </div>

  </>
);

export default function PlayerSettings({ 
  subtitleMode, 
  onChangeSubtitleMode,
  subtitleOpacity,
  onChangeSubtitleOpacity,
  onClose
}: PlayerSettingsProps) {
  return (
    <div
      className="absolute inset-0 sm:relative sm:inset-auto z-50 pointer-events-none"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Mobile Full Overlay */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md pointer-events-auto sm:hidden flex flex-col items-center justify-center p-6">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/60 hover:text-white"
          aria-label="Cerrar"
        >
          <Icon name="x" size="lg" />
        </button>
        <div className="w-full max-w-[280px] flex flex-col gap-6">
          <SettingsContent 
            subtitleMode={subtitleMode}
            onChangeSubtitleMode={onChangeSubtitleMode}
            subtitleOpacity={subtitleOpacity}
            onChangeSubtitleOpacity={onChangeSubtitleOpacity}
          />
        </div>
      </div>

      {/* Desktop Popup */}
      <div className="hidden sm:flex pointer-events-auto flex-col gap-3 p-3 rounded-xl shadow-2xl backdrop-blur-md border border-white/10 bg-black/80 sm:absolute sm:bottom-full sm:right-4 sm:mb-4 sm:min-w-[180px]">
        <SettingsContent 
          subtitleMode={subtitleMode}
          onChangeSubtitleMode={onChangeSubtitleMode}
          subtitleOpacity={subtitleOpacity}
          onChangeSubtitleOpacity={onChangeSubtitleOpacity}
        />
      </div>
    </div>
  );
}

