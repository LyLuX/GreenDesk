import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import client from '../api/client.js';
import { clearSession, readSession, saveSession, SESSION_STORAGE_KEY } from './auth.storage.js';
import { isJwtExpired } from './jwt.js';
import { clearReturnLocation } from './return-location.js';
import { resolveActiveCompany, saveActiveCompanyUuid } from './company.storage.js';
import {
  ACTIVITY_THROTTLE_MS,
  getLastActivityAt,
  getTokenRemainingMs,
  isSessionInactive,
  reloadApplication,
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_REFRESH_THRESHOLD_MS,
} from './session-timeout.js';
export const AuthContext = createContext(null);

const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [activeCompany, setActiveCompany] = useState(null);
  const [isInitializing, setInitializing] = useState(true);
  const [isLoggingOut, setLoggingOut] = useState(false);
  const sessionRef = useRef(null);
  const lastActivityRef = useRef(0);
  const lastPersistedActivityRef = useRef(0);
  const idleTimerRef = useRef(null);
  const refreshPromiseRef = useRef(null);
  const isEndingSessionRef = useRef(false);

  const expireInactiveSession = useCallback(() => {
    isEndingSessionRef.current = true;
    clearTimeout(idleTimerRef.current);
    clearSession();
    sessionRef.current = null;
    setSession(null);
    setActiveCompany(null);
    reloadApplication();
  }, []);

  const scheduleIdleTimeout = useCallback(
    function schedule(lastActivityAt) {
      clearTimeout(idleTimerRef.current);
      const remaining = SESSION_IDLE_TIMEOUT_MS - (Date.now() - lastActivityAt);
      if (remaining <= 0) {
        expireInactiveSession();
        return;
      }
      idleTimerRef.current = setTimeout(() => {
        const latestActivityAt = lastActivityRef.current;
        if (Date.now() - latestActivityAt >= SESSION_IDLE_TIMEOUT_MS) {
          expireInactiveSession();
        } else {
          schedule(latestActivityAt);
        }
      }, remaining);
    },
    [expireInactiveSession],
  );

  const refreshSessionIfNeeded = useCallback(async () => {
    const current = sessionRef.current;
    if (
      isEndingSessionRef.current ||
      !current?.accessToken ||
      refreshPromiseRef.current ||
      getTokenRemainingMs(current.accessToken) > SESSION_REFRESH_THRESHOLD_MS
    ) {
      return;
    }
    const refreshedToken = current.accessToken;
    refreshPromiseRef.current = client
      .post('/v1/auth/refresh')
      .then(({ data }) => {
        if (isEndingSessionRef.current || sessionRef.current?.accessToken !== refreshedToken) {
          return;
        }
        const next = {
          ...data.data,
          lastActivityAt: lastActivityRef.current,
        };
        saveSession(next);
        sessionRef.current = next;
        setSession(next);
        setActiveCompany(resolveActiveCompany(next.user?.companies));
      })
      .finally(() => {
        refreshPromiseRef.current = null;
      });
    await refreshPromiseRef.current;
  }, []);

  useEffect(() => {
    const restored = readSession();
    if (restored && !isJwtExpired(restored.accessToken) && !isSessionInactive(restored)) {
      const next = {
        ...restored,
        lastActivityAt: getLastActivityAt(restored),
      };
      isEndingSessionRef.current = false;
      saveSession(next);
      sessionRef.current = next;
      setSession(next);
      setActiveCompany(resolveActiveCompany(next.user?.companies));
    } else {
      clearSession();
    }
    setInitializing(false);
    const expired = () => {
      isEndingSessionRef.current = true;
      clearSession();
      sessionRef.current = null;
      setSession(null);
      setActiveCompany(null);
    };
    window.addEventListener('greendesk:unauthorized', expired);
    return () => window.removeEventListener('greendesk:unauthorized', expired);
  }, []);

  useEffect(() => {
    sessionRef.current = session;
    if (!session?.accessToken) {
      clearTimeout(idleTimerRef.current);
      return undefined;
    }

    lastActivityRef.current = getLastActivityAt(session);
    lastPersistedActivityRef.current = lastActivityRef.current;
    scheduleIdleTimeout(lastActivityRef.current);

    const recordActivity = () => {
      const now = Date.now();
      if (now - lastActivityRef.current >= SESSION_IDLE_TIMEOUT_MS) {
        expireInactiveSession();
        return;
      }
      lastActivityRef.current = now;
      if (now - lastPersistedActivityRef.current < ACTIVITY_THROTTLE_MS) return;

      lastPersistedActivityRef.current = now;
      const next = { ...sessionRef.current, lastActivityAt: now };
      sessionRef.current = next;
      saveSession(next);
      scheduleIdleTimeout(now);
      refreshSessionIfNeeded().catch(() => {
        // A 401 response is handled globally and clears the invalid session.
      });
    };
    const recordVisibleActivity = () => {
      if (document.visibilityState === 'visible') recordActivity();
    };
    const synchronizeSession = (event) => {
      if (event.key !== SESSION_STORAGE_KEY) return;
      const stored = readSession();
      if (!stored) {
        sessionRef.current = null;
        setSession(null);
        setActiveCompany(null);
        return;
      }
      sessionRef.current = stored;
      lastActivityRef.current = getLastActivityAt(stored);
      lastPersistedActivityRef.current = lastActivityRef.current;
      setSession(stored);
      setActiveCompany(resolveActiveCompany(stored.user?.companies));
    };
    const persistLatestActivity = () => {
      const current = sessionRef.current;
      if (!current?.accessToken || lastActivityRef.current <= lastPersistedActivityRef.current) {
        return;
      }
      lastPersistedActivityRef.current = lastActivityRef.current;
      saveSession({ ...current, lastActivityAt: lastActivityRef.current });
    };

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, recordActivity, { passive: true });
    }
    document.addEventListener('visibilitychange', recordVisibleActivity);
    window.addEventListener('storage', synchronizeSession);
    window.addEventListener('pagehide', persistLatestActivity);

    return () => {
      clearTimeout(idleTimerRef.current);
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, recordActivity);
      }
      document.removeEventListener('visibilitychange', recordVisibleActivity);
      window.removeEventListener('storage', synchronizeSession);
      window.removeEventListener('pagehide', persistLatestActivity);
    };
  }, [session, expireInactiveSession, refreshSessionIfNeeded, scheduleIdleTimeout]);

  const login = useCallback(async (email, password) => {
    const { data } = await client.post('/v1/auth/login', { email, password });
    const next = { ...data.data, lastActivityAt: Date.now() };
    isEndingSessionRef.current = false;
    setLoggingOut(false);
    saveSession(next);
    sessionRef.current = next;
    setSession(next);
    setActiveCompany(resolveActiveCompany(next.user?.companies, { preserveSelection: false }));
    return next;
  }, []);
  const logout = useCallback(async () => {
    isEndingSessionRef.current = true;
    setLoggingOut(true);
    try {
      if (session?.accessToken) await client.post('/v1/auth/logout');
    } catch {
      // Local cleanup is still required if the server cannot be reached.
    } finally {
      clearReturnLocation();
      clearSession();
      saveActiveCompanyUuid(null);
      sessionRef.current = null;
      setSession(null);
      setActiveCompany(null);
    }
  }, [session]);
  const hasPermission = useCallback(
    (permission) => session?.user?.permissions?.includes(permission) === true,
    [session],
  );
  const selectCompany = useCallback(
    (uuid) => {
      const company = session?.user?.companies?.find((item) => item.uuid === uuid);
      if (!company) return false;
      saveActiveCompanyUuid(company.uuid);
      setActiveCompany(company);
      return true;
    },
    [session],
  );
  const refreshCompanies = useCallback(async () => {
    if (!sessionRef.current?.accessToken) return [];
    const { data } = await client.post('/v1/auth/refresh');
    const companies = data.data.user?.companies ?? [];
    const next = {
      ...data.data,
      lastActivityAt: lastActivityRef.current || Date.now(),
    };
    saveSession(next);
    sessionRef.current = next;
    setSession(next);
    setActiveCompany(resolveActiveCompany(companies));
    return companies;
  }, []);
  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      isAuthenticated: Boolean(session?.accessToken),
      isInitializing,
      isLoggingOut,
      login,
      logout,
      hasPermission,
      companies: session?.user?.companies ?? [],
      activeCompany,
      selectCompany,
      refreshCompanies,
    }),
    [
      session,
      isInitializing,
      isLoggingOut,
      login,
      logout,
      hasPermission,
      activeCompany,
      selectCompany,
      refreshCompanies,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
