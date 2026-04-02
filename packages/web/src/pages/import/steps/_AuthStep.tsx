import React from 'react';

import { Icon } from '@web/components/Icon';
import { Button } from '@web/components/Button';
import { useWizard } from '@web/components/Wizard/WizardContext';
import { WizardActionButtons } from '@web/components/Wizard/WizardActionButtons';

interface AuthStepProps {
  authStatus: { isAuthenticated: boolean; isLoggingIn: boolean; message: string; checked: boolean };
  isLoading: boolean;
  authLoading: boolean;
  checkAuth: () => Promise<boolean>;
  launchLogin: () => Promise<void>;
}

export const AuthStep: React.FC<AuthStepProps> = ({
  authStatus,
  isLoading,
  authLoading,
  checkAuth,
  launchLogin
}) => {
  const { setCanProceed } = useWizard();

  React.useEffect(() => {
    setCanProceed(authStatus.isAuthenticated);
  }, [authStatus.isAuthenticated, setCanProceed]);

  const handleValidate = async () => {
    await checkAuth();
  };

  // Polling automático mientras se está en proceso de login para actualizar UI
  React.useEffect(() => {
    let interval: any;
    if (authStatus.isLoggingIn) {
      interval = setInterval(() => {
        checkAuth();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [authStatus.isLoggingIn]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center py-8 animate-in fade-in slide-in-from-right-4 duration-500">
        <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-1000 ${authStatus.isAuthenticated ? 'bg-green-600 text-white shadow-2xl shadow-green-600/40' : 'bg-surface-800 border-2 border-border-subtle text-text-muted p-1 border-dashed'}`}>
          <div className={`w-full h-full rounded-full flex items-center justify-center ${authStatus.isAuthenticated ? '' : 'bg-surface-900 font-bold'}`}>
            <Icon name={authStatus.isAuthenticated ? "check" : "lock"} size="xl" />
          </div>
        </div>

        <h3 className="text-2xl font-bold mt-12 mb-4 tracking-tight text-text-primary">Acceso a la Plataforma</h3>
        <p className="text-sm text-text-muted text-center max-w-sm mb-16 leading-relaxed">
          Para acceder a los servidores de alta velocidad de Oracle y convertir las guías a PDF, requerimos una sesión de navegación válida en tu equipo local.
        </p>

        {authStatus.checked ? (
          <div className={`w-full max-w-md p-7 rounded-3xl border flex items-center gap-5 animate-in zoom-in duration-700 ${authStatus.isAuthenticated ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20 shadow-xl shadow-red-500/5'}`}>
            <div className={`p-3 rounded-2xl ${authStatus.isAuthenticated ? 'bg-green-500' : 'bg-red-500'} text-white shadow-lg`}>
              <Icon name={authStatus.isAuthenticated ? "check-circle" : "alert-circle"} size="sm" />
            </div>
            <div className="flex-1">
              <div className={`font-bold text-base ${authStatus.isAuthenticated ? 'text-green-400' : 'text-red-400'}`}>{authStatus.isAuthenticated ? 'Conexión Exitosa' : 'Inicio de Sesión Requerido'}</div>
              <div className="text-xs text-text-muted mt-0.5">{authStatus.message}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              square
              icon="rotate-cw"
              onClick={(e) => { e.preventDefault(); checkAuth(); }}
              title="Refrescar"
              iconClass="group-hover:rotate-180 duration-700"
            />
          </div>
        ) : (
          <Button
            onClick={handleValidate}
            loading={isLoading}
            size="md"
            icon="lock"
            className="shadow-2xl shadow-brand-600/30"
          >
            {isLoading ? 'Comprobando SSL...' : 'Validar mi sesión de Oracle'}
          </Button>
        )}

        <div className="mt-12 w-full max-w-md space-y-6 animate-in slide-in-from-bottom-4 duration-1000">
            <Button
              variant="outline"
              onClick={launchLogin}
              loading={authLoading}
              block
              size="md"
              icon="external-link"
              className="border-brand-500/30 text-brand-500 rounded-xl"
            >
              {authLoading ? 'Abriendo Navegador...' : 'Abrir Navegador de Autenticación'}
            </Button>

            {(authStatus.isLoggingIn || authLoading) && (
              <Button
                variant="primary"
                onClick={async () => {
                  const res = await fetch('/api/scraper/save-session', { method: 'POST' });
                  const data = await res.json();
                  if (data.success) {
                    await checkAuth();
                  } else {
                    alert(data.error || 'Error al guardar la sesión');
                  }
                }}
                block
                size="md"
                icon="download"
                className="bg-green-600 hover:bg-green-500 shadow-lg shadow-green-600/20"
              >
                Confirmar y Finalizar Sesión
              </Button>
            )}

            {!authStatus.isAuthenticated && authStatus.checked && !authLoading && (
              <Button
                onClick={checkAuth}
                loading={isLoading}
                block
                size="md"
                icon="rotate-cw"
                className="shadow-xl shadow-brand-600/20"
              >
                {isLoading ? 'Verificando...' : 'Validar sesión ahora'}
              </Button>
            )}
          </div>

          {!authStatus.isAuthenticated && authStatus.checked && (
            <div className="p-8 rounded-3xl bg-surface-950 border border-border-subtle animate-in slide-in-from-top-6 duration-1000">
              <div className="text-[10px] font-black text-brand-500 uppercase mb-4 tracking-[0.3em] flex items-center gap-2">
                <Icon name="terminal" size="xs" />
                Terminal Recovery
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed mb-6">
                Si prefieres la terminal, abre una ventana y ejecuta el siguiente comando:
              </p>
              <div className="p-5 rounded-2xl bg-black/40 border border-white/5 font-mono text-brand-400 text-sm flex justify-between items-center group cursor-copy hover:border-brand-500/20 transition-all active:bg-brand-600/10">
                <code>pnpm cli login</code>
                <Icon name="copy" size="xs" className="opacity-20 group-hover:opacity-100 transition-all" />
              </div>
            </div>
          )}
      </div>

      <WizardActionButtons nextLabel="Configurar Descarga" />
    </div>
  );
};
