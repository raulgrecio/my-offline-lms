import React from 'react';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { Button } from './Button';
import { useAuth } from '@web/hooks/useAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { authStatus, isLoading, isLaunchingLogin, checkAuth, launchLogin, saveSession } = useAuth();

  React.useEffect(() => {
    if (authStatus.isAuthenticated && onSuccess) {
      onSuccess();
    }
  }, [authStatus.isAuthenticated, onSuccess]);

  const isPendingSession = authStatus.isLoggingIn || isLaunchingLogin;
  const { isAuthenticated, checked } = authStatus;

  if (!checked && isOpen) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Cargando...">
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-muted">Verificando sesión...</p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAuthenticated ? "Sesión Activa" : "Acceso Requerido"}
      maxWidth="max-w-md"
    >
      <div className="flex flex-col items-center text-center space-y-6">
        {/* Status Header */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 ${isAuthenticated ? 'bg-status-completed text-white shadow-xl shadow-status-completed/20' : 'bg-surface-800 text-text-muted border border-border-subtle'}`}>
          <Icon name={isAuthenticated ? "check" : "lock"} size="md" />
        </div>

        <div className="space-y-1.5">
          <h4 className="text-lg font-bold text-text-primary capitalize">
            {isAuthenticated ? '¡Listo para empezar!' : 'Sincroniza tu cuenta'}
          </h4>
          <p className="text-xs text-text-muted leading-relaxed px-4">
            {isAuthenticated
              ? 'Tu sesión en Oracle MyLearn está activa. Puedes cerrar esta ventana y empezar a descargar.'
              : 'Necesitamos validar tu acceso a la plataforma para poder sincronizar el contenido.'}
          </p>
        </div>

        {/* Action Area */}
        <div className="w-full space-y-4 pt-2">
          {isPendingSession ? (
            /* Phase 2: Waiting for user to complete login in browser */
            <div className="space-y-4 animate-in fade-in zoom-in duration-500">
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-start gap-3 text-left">
                <Icon name="alert-circle" size="xs" className="text-blue-400 mt-0.5" />
                <p className="text-xs text-text-muted leading-tight">
                  Abre la plataforma en tu navegador, inicia sesión y busca el contenido. El scraper detectará tu sesión automáticamente.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant="primary"
                  block
                  onClick={saveSession}
                  loading={isLoading}
                  icon="check-circle"
                  className="bg-status-completed hover:bg-status-completed shadow-lg shadow-status-completed/20"
                >
                  Confirmar y Guardar Sesión
                </Button>
                <Button variant="ghost" block onClick={launchLogin} size="sm">
                  Re-abrir navegador
                </Button>
              </div>
            </div>
          ) : (
            /* Phase 1: Initial state or already authenticated */
            <div className="space-y-3">
              {isAuthenticated ? (
                <div className="flex flex-col gap-3">
                  <Button variant="primary" block onClick={onClose} icon="check">
                    Entendido, continuar
                  </Button>
                  <Button variant="ghost" block onClick={launchLogin} size="sm" className="text-text-muted opacity-60 hover:opacity-100">
                    Abrir navegador de nuevo
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Button
                    variant="primary"
                    block
                    onClick={launchLogin}
                    loading={isLoading || isLaunchingLogin}
                    icon="external-link"
                    className="shadow-lg shadow-brand-600/20"
                  >
                    Abrir Navegador y Loguear
                  </Button>
                  <Button
                    variant="ghost"
                    block
                    onClick={checkAuth}
                    loading={isLoading && !isLaunchingLogin}
                    icon="rotate-cw"
                    size="sm"
                    className="text-text-muted"
                  >
                    Ya tengo una sesión, validar ahora
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footnote: CLI Option (Only shown when not authenticated) */}
        {!isAuthenticated && !isPendingSession && (
          <div className="w-full pt-4 border-t border-border-subtle group">
            <div className="flex items-center gap-2 mb-2 justify-center opacity-40 group-hover:opacity-100 transition-opacity">
              <Icon name="terminal" size="xs" />
              <span className="text-2xs font-black uppercase tracking-widest">Alternativa por Terminal</span>
            </div>
            <div
              className="p-3 bg-black/20 border border-white/5 rounded-xl font-mono text-2xs text-text-muted flex justify-between items-center cursor-copy hover:border-white/10 transition-colors"
              onClick={() => navigator.clipboard.writeText('pnpm cli login')}
            >
              <code>pnpm cli login</code>
              <Icon name="copy" size="xs" className="opacity-20" />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
