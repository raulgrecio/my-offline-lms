import { useState, useCallback, useEffect } from 'react';

import { apiClient } from '@web/platform/api/client';
import { API_ROUTES } from '@web/platform/api/routes';
import { logger } from '@web/platform/logging';

export interface AuthStatus {
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  isLoginDetected?: boolean;
  message: string;
  checked: boolean;
}

export function useAuth() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isAuthenticated: false,
    isLoggingIn: false,
    isLoginDetected: false,
    message: '',
    checked: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLaunchingLogin, setIsLaunchingLogin] = useState(false);

  const checkAuth = useCallback(async (options: { silent?: boolean; forceDeep?: boolean } = {}) => {
    const { silent = false, forceDeep = false } = options;
    if (!silent) setIsLoading(true);
    try {
      const url = forceDeep ? `${API_ROUTES.SCRAPER.AUTH_STATUS}?deep=true` : API_ROUTES.SCRAPER.AUTH_STATUS;
      const data = await apiClient.get<any>(url);
      const status = {
        isAuthenticated: data.isAuthenticated,
        isLoggingIn: data.isLoggingIn,
        isLoginDetected: data.isLoginDetected,
        message: data.message,
        checked: true
      };
      setAuthStatus(status);
      return status.isAuthenticated;
    } catch (err: any) {
      const status = {
        isAuthenticated: false,
        isLoggingIn: false,
        isLoginDetected: false,
        message: err.message || 'Error al verificar sesión',
        checked: true
      };
      setAuthStatus(status);
      return false;
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  const launchLogin = useCallback(async () => {
    setIsLaunchingLogin(true);
    try {
      await apiClient.post(API_ROUTES.SCRAPER.LOGIN);
      await checkAuth({ forceDeep: true });
    } catch (err: any) {
      logger.error('Failed to launch login:', err);
    } finally {
      setIsLaunchingLogin(false);
    }
  }, [checkAuth]);

  const saveSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.post<any>(API_ROUTES.SCRAPER.SAVE_SESSION);
      if (data.success) {
        await checkAuth({ forceDeep: true });
        return true;
      } else {
        throw new Error(data.error || 'Error al guardar la sesión');
      }
    } catch (err: any) {
      logger.error('Failed to save session:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [checkAuth]);

  // Initial check and auto-polling during login
  useEffect(() => {
    // Initial deep check to ensure status is real
    checkAuth({ forceDeep: true });
    
    let interval: NodeJS.Timeout | null = null;

    if (authStatus.isLoggingIn || isLaunchingLogin) {
      interval = setInterval(() => {
        checkAuth({ silent: true }); // silent polling
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [authStatus.isLoggingIn, isLaunchingLogin, checkAuth]);

  // Reactive updates when window regains focus
  useEffect(() => {
    const onFocus = () => checkAuth({ silent: true, forceDeep: true });
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [checkAuth]);

  return {
    authStatus,
    isLoading,
    isLaunchingLogin,
    checkAuth,
    launchLogin,
    saveSession
  };
}
