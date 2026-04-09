import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@web/platform/api/client';
import { API_ROUTES } from '@web/platform/api/routes';
import { logger } from '@web/platform/logging';

export interface AuthStatus {
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  message: string;
  checked: boolean;
}

export function useAuth() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isAuthenticated: false,
    isLoggingIn: false,
    message: '',
    checked: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLaunchingLogin, setIsLaunchingLogin] = useState(false);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<any>(API_ROUTES.SCRAPER.AUTH_STATUS);
      const status = {
        isAuthenticated: data.isAuthenticated,
        isLoggingIn: data.isLoggingIn,
        message: data.message,
        checked: true
      };
      setAuthStatus(status);
      return status.isAuthenticated;
    } catch (err: any) {
      const status = {
        isAuthenticated: false,
        isLoggingIn: false,
        message: err.message || 'Error al verificar sesión',
        checked: true
      };
      setAuthStatus(status);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const launchLogin = useCallback(async () => {
    setIsLaunchingLogin(true);
    try {
      await apiClient.post(API_ROUTES.SCRAPER.LOGIN);
      await checkAuth();
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
        await checkAuth();
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

  // Initial check
  useEffect(() => {
    checkAuth();
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
