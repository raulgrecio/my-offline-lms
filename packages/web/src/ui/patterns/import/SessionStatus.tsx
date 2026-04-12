import React from 'react';
import { useAuth } from '@web/hooks/useAuth';
import { Icon } from '@web/ui/primitives/Icon';
import { Button } from '@web/ui/components/Button';

export const SessionStatus: React.FC = () => {
  const { authStatus, isLoading } = useAuth();

  const handleOpen = () => {
    const event = new CustomEvent('open-auth-modal');
    document.dispatchEvent(event);
  };

  // Prevent flickering during the very first load until status is confirmed
  if (!authStatus.checked) {
    return <div className="h-10 w-32 opacity-0" />;
  }

  return (
    <Button
      variant="none"
      onClick={handleOpen}
      className={`
        flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all duration-500
        ${authStatus.isAuthenticated
          ? 'bg-status-completed/5 border-status-completed/20 hover:bg-status-completed/10'
          : 'bg-status-failed/5 border-status-failed/20 hover:bg-status-failed/10 shadow-lg shadow-status-failed/5'}
      `}
    >
      <div className={`relative flex items-center justify-center`}>
        <div className={`w-2.5 h-2.5 rounded-full ${authStatus.isAuthenticated ? 'bg-status-completed' : 'bg-status-failed'} ${isLoading ? 'animate-pulse' : ''}`} />
        {authStatus.isAuthenticated && (
          <div className="absolute inset-0 rounded-full bg-status-completed animate-ping opacity-20" />
        )}
      </div>

      <div className="flex flex-col">
        <div className={`text-2xs font-black uppercase tracking-widest ${authStatus.isAuthenticated ? 'text-status-completed/80' : 'text-status-failed/80'}`}>
          Plataforma
        </div>
        <div className="text-xs font-bold text-text-primary whitespace-nowrap">
          {authStatus.isAuthenticated ? 'Sesión Activa' : 'Iniciar Sesión'}
        </div>
      </div>

      <Icon
        name={authStatus.isAuthenticated ? "check-circle" : "chevron-right"}
        size="xs"
        className={authStatus.isAuthenticated ? "text-status-completed" : "text-status-failed group-hover:translate-x-1 transition-transform"}
      />
    </Button>
  );
};
