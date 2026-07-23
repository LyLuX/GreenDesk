import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import client from '../api/client.js';
import { clearSession, readSession, saveSession } from './auth.storage.js';
export const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isInitializing, setInitializing] = useState(true);
  useEffect(() => {
    setSession(readSession());
    setInitializing(false);
    const expired = () => {
      clearSession();
      setSession(null);
    };
    window.addEventListener('greendesk:unauthorized', expired);
    return () => window.removeEventListener('greendesk:unauthorized', expired);
  }, []);
  const login = useCallback(async (email, password) => {
    const { data } = await client.post('/v1/auth/login', { email, password });
    const next = data.data;
    saveSession(next);
    setSession(next);
    return next;
  }, []);
  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);
  const hasPermission = useCallback(
    (permission) =>
      session?.user?.roles?.includes('ADMIN') || session?.user?.permissions?.includes(permission),
    [session],
  );
  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      isAuthenticated: Boolean(session?.accessToken),
      isInitializing,
      login,
      logout,
      hasPermission,
    }),
    [session, isInitializing, login, logout, hasPermission],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
