import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { currentUserRequest, loginRequest } from './auth-api';
import { AuthContext, type AuthContextValue } from './auth-context';
import type { AuthStatus, AuthUser } from './auth.types';

const ACCESS_TOKEN_KEY = 'glass-demo.access-token';

// VI: Provider luu JWT trong sessionStorage va dong bo user bang /auth/me.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => sessionStorage.getItem(ACCESS_TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(accessToken ? 'loading' : 'anonymous');

  useEffect(() => {
    if (!accessToken) {
      setStatus('anonymous');
      setUser(null);
      return;
    }

    let isActive = true;

    const restoreSession = async () => {
      try {
        const currentUser = await currentUserRequest(accessToken);

        if (isActive) {
          setUser(currentUser);
          setStatus('authenticated');
        }
      } catch (error) {
        if (isActive) {
          // VI: Token het han hoac loi auth se duoc xoa, khong hien raw backend object tren UI.
          console.error({
            module: 'AuthProvider',
            action: 'restoreSession',
            message: 'Failed to restore authenticated session',
            error,
          });
          sessionStorage.removeItem(ACCESS_TOKEN_KEY);
          setAccessToken(null);
          setUser(null);
          setStatus('anonymous');
        }
      }
    };

    void restoreSession();

    return () => {
      isActive = false;
    };
  }, [accessToken]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginRequest(email, password);
    sessionStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    setAccessToken(response.accessToken);
    setUser(response.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(() => {
    // VI: Sprint 1 logout la client-side token clear; server-side revoke de danh cho kien truc sau.
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    setAccessToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      accessToken,
      login,
      logout,
    }),
    [accessToken, login, logout, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
