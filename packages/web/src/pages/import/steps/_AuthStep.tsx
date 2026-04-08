import React from 'react';

import { Icon } from '@web/components/Icon';
import { Button } from '@web/components/Button';
import { useWizard } from '@web/components/Wizard/WizardContext';
import { WizardActionButtons } from '@web/components/Wizard/WizardActionButtons';
import { apiClient } from '@web/platform/api/client';
import { API_ROUTES } from '@web/platform/api/routes';

interface SaveSessionResponse {
  success: boolean;
  error?: string;
}

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
  const [localIsLoggingIn, setLocalIsLoggingIn] = React.useState(false);

  React.useEffect(() => {
    setCanProceed(authStatus.isAuthenticated);
    if (authStatus.isAuthenticated) {
      setLocalIsLoggingIn(false);
    }
  }, [authStatus.isAuthenticated, setCanProceed]);

  const handleValidate = async () => {
    await checkAuth();
  };

  const handleLaunchLogin = async () => {
    setLocalIsLoggingIn(true);
    await launchLogin();
  };

  // Polling automático mientras se está en proceso de login para actualizar UI
  // Ahora iniciamos el polling si localIsLoggingIn es true o si authStatus dice que está logueando
  React.useEffect(() => {
    let interval: any;
    if (authStatus.isLoggingIn || localIsLoggingIn || authLoading) {
      // Polling más frecuente (2.5s) para una UI más responsiva
      interval = setInterval(() => {
        checkAuth().then(isAuth => {
          if (isAuth) setLocalIsLoggingIn(false);
        });
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [authStatus.isLoggingIn, localIsLoggingIn, authLoading, checkAuth]);

  const isPendingSession = authStatus.isLoggingIn || authLoading || localIsLoggingIn;
  const showInitialValidation = !authStatus.checked;
  const showLoginFlow = authStatus.checked && !authStatus.isAuthenticated && !isPendingSession;
  const showStatusCard = authStatus.checked;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center py-8 animate-in fade-in slide-in-from-right-4 duration-500">
        {/* Visual Indicator */}
        <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-1000 ${authStatus.isAuthenticated ? 'bg-green-600 text-white shadow-2xl shadow-green-600/40' : 'bg-surface-800 border-2 border-border-subtle text-text-muted p-1 border-dashed'}`}>
          <div className={`w-full h-full rounded-full flex items-center justify-center ${authStatus.isAuthenticated ? '' : 'bg-surface-900 font-bold'}`}>
            <Icon name={authStatus.isAuthenticated ? "check" : "lock"} size="xl" />
          </div>
        </div>

        <h3 className="text-2xl font-bold mt-12 mb-4 tracking-tight text-text-primary">Acceso a la Plataforma</h3>
        <p className="text-sm text-text-muted text-center max-w-sm mb-4 leading-relaxed">
          Para acceder a los servidores de alta velocidad de Oracle y convertir las guías a PDF, requerimos una sesión de navegación válida en tu equipo local.
        </p>

        {/* Status Section */}
        {showStatusCard && (
          <div className={`w-full max-w-md p-7 rounded-3xl border flex items-center gap-5 animate-in zoom-in duration-700 ${authStatus.isAuthenticated ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20 shadow-xl shadow-red-500/5'}`}>
            <div className={`p-3 rounded-2xl ${authStatus.isAuthenticated ? 'bg-green-500' : 'bg-red-500'} text-white shadow-lg`}>
              <Icon name={authStatus.isAuthenticated ? "check-circle" : "alert-circle"} size="sm" />
            </div>
            <div className="flex-1">
              <div className={`font-bold text-base ${authStatus.isAuthenticated ? 'text-green-400' : 'text-red-400'}`}>
                {authStatus.isAuthenticated ? 'Conexión Exitosa' : 'Inicio de Sesión Requerido'}
              </div>
              <div className="text-xs text-text-muted mt-0.5">{authStatus.message}</div>
            </div>
            {!authStatus.isAuthenticated && (
              <Button
                variant="outline"
                size="sm"
                square
                icon="rotate-cw"
                onClick={(e) => { e.preventDefault(); checkAuth(); }}
                loading={isLoading}
                title="Reintentar Validación"
                iconClass="group-hover:rotate-180 duration-700"
              />
            )}
          </div>
        )}

        {/* Action Area */}
        <div className="mt-4 w-full max-w-md space-y-4 animate-in slide-in-from-bottom-4 duration-1000">

          {/* Action 1: Initial/Retry Validation */}
          {showInitialValidation && (
            <Button
              onClick={handleValidate}
              loading={isLoading}
              block
              size="md"
              icon="lock"
              className="shadow-2xl shadow-brand-600/30"
            >
              Validar mi sesión
            </Button>
          )}

          {/* Action 2: Launch Browser (Failed/Initial) */}
          {(true || showLoginFlow) && (
            <Button
              variant="primary"
              onClick={handleLaunchLogin}
              loading={authLoading}
              block
              size="md"
              icon="external-link"
              className="shadow-xl shadow-brand-600/20 rounded-2xl"
            >
              Iniciar Sesión en Navegador
            </Button>
          )}

          {/* Action 3: Confirm Pending Session */}
          {isPendingSession && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-start gap-4">
                <Icon name="alert-circle" size="xs" className="text-blue-400 mt-1" />
                <p className="text-[11px] text-text-muted leading-tight">
                  Hemos abierto una ventana del navegador. Completa el login en Oracle MyLearn y luego pulsa el botón de abajo para guardar tu acceso.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={async () => {
                  const data = await apiClient.post<SaveSessionResponse>(API_ROUTES.SCRAPER.SAVE_SESSION);
                  if (data.success) {
                    await checkAuth();
                  } else {
                    alert(data.error || 'Error al guardar la sesión');
                  }
                }}
                block
                size="md"
                icon="download"
                className="bg-green-600 hover:bg-green-500 shadow-2xl shadow-green-600/30"
              >
                Confirmar y Guardar Sesión
              </Button>
            </div>
          )}
        </div>

        {/* Support Info */}
        {!authStatus.isAuthenticated && (
          <div className="mt-12 w-full max-w-md p-8 rounded-3xl bg-surface-950 border border-border-subtle animate-in slide-in-from-top-6 duration-1000">
            <div className="text-[10px] font-black text-brand-500 uppercase mb-4 tracking-[0.3em] flex items-center gap-2">
              <Icon name="terminal" size="xs" />
              Terminal Recovery
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed mb-6">
              Si prefieres la terminal, abre una ventana y ejecuta el siguiente comando para generar una sesión válida:
            </p>
            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 font-mono text-brand-400 text-sm flex justify-between items-center group cursor-copy hover:border-brand-500/20 transition-all active:bg-brand-600/10"
              onClick={() => navigator.clipboard.writeText('pnpm cli login')}>
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
