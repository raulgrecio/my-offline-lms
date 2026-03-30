import React, { useState } from 'react';
import { Icon } from '../Icon';

export const ScraperForm: React.FC = () => {
  const [url, setUrl] = useState('');
  const [type, setType] = useState<'course' | 'path'>('course');
  const [downloadVideos, setDownloadVideos] = useState(true);
  const [downloadGuides, setDownloadGuides] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ type: 'info', message: 'Iniciando sincronización...' });

    try {
      // TODO: Implement actual API call
      // const response = await fetch('/api/scraper/sync', {
      //   method: 'POST',
      //   body: JSON.stringify({ url, type, downloadVideos, downloadGuides }),
      // });
      
      // Simulate long process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStatus({ 
        type: 'success', 
        message: '¡Sincronización iniciada con éxito! Revisa el estado abajo.' 
      });
      setUrl('');
    } catch (err) {
      setStatus({ 
        type: 'error', 
        message: 'Error al conectar con el servidor de scraping.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* URL Input */}
        <div className="space-y-2">
          <label htmlFor="url" className="text-sm font-semibold text-text-secondary block">
            URL del Curso o Learning Path
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
              <Icon name="link" size="sm" />
            </div>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://platform.com/course/..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-800 border border-border-subtle focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-all text-sm"
              required
            />
          </div>
        </div>

        {/* Type Selection */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setType('course')}
            className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
              type === 'course' 
                ? 'bg-brand-600/10 border-brand-500 text-brand-500' 
                : 'bg-surface-800 border-border-subtle text-text-muted hover:border-border-default'
            }`}
          >
            <Icon name="book-open" size="sm" />
            <span className="text-sm font-medium">Curso</span>
          </button>
          <button
            type="button"
            onClick={() => setType('path')}
            className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
              type === 'path' 
                ? 'bg-brand-600/10 border-brand-500 text-brand-500' 
                : 'bg-surface-800 border-border-subtle text-text-muted hover:border-border-default'
            }`}
          >
            <Icon name="layers" size="sm" />
            <span className="text-sm font-medium">Learning Path</span>
          </button>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-800 border border-border-subtle cursor-pointer hover:border-border-default transition-all">
            <input
              type="checkbox"
              checked={downloadVideos}
              onChange={(e) => setDownloadVideos(e.target.checked)}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 bg-surface-700 border-border-subtle"
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-text-primary">Descargar Vídeos</span>
              <span className="text-[10px] text-text-muted">Formato MP4</span>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-xl bg-surface-800 border border-border-subtle cursor-pointer hover:border-border-default transition-all">
            <input
              type="checkbox"
              checked={downloadGuides}
              onChange={(e) => setDownloadGuides(e.target.checked)}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 bg-surface-700 border-border-subtle"
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-text-primary">Descargar Guías</span>
              <span className="text-[10px] text-text-muted">PDFs</span>
            </div>
          </label>
        </div>
      </div>

      {status && (
        <div className={`p-4 rounded-xl text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
          status.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
          status.type === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
          'bg-brand-500/10 text-brand-500 border border-brand-500/20'
        }`}>
          <div className="mt-0.5">
            <Icon name={status.type === 'success' ? 'check-circle' : 'alert-circle'} size="sm" />
          </div>
          <p>{status.message}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !url}
        className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
          isLoading || !url
            ? 'bg-surface-700 text-text-muted cursor-not-allowed'
            : 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/20 hover:-translate-y-0.5'
        }`}
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Procesando...</span>
          </>
        ) : (
          <>
            <Icon name="rocket" size="md" />
            <span>Iniciar Sincronización</span>
          </>
        )}
      </button>

      <p className="text-[11px] text-center text-text-muted px-4">
        Asegúrate de tener una sesión activa. Si la descarga falla, intenta ejecutar 
        <code className="mx-1 bg-surface-700 px-1 rounded text-text-secondary font-mono">pnpm cli login</code> 
        en tu terminal.
      </p>
    </form>
  );
};
