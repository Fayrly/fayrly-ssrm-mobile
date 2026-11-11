import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import {
  bindAuthBridge,
  fetchMe,
  login as loginRequest,
  logoutRequest,
  refreshSession,
  register as registerRequest,
  type RegisterPayload,
  type Session,
  type SessionUser,
} from '@/lib/api';

const STORAGE_KEY = 'fayrly.mobile.session';

const storage = {
  async read(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return typeof window === 'undefined' ? null : window.localStorage.getItem(STORAGE_KEY);
    }
    return AsyncStorage.getItem(STORAGE_KEY);
  },
  async write(value: string): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, value);
      }
      return;
    }
    await AsyncStorage.setItem(STORAGE_KEY, value);
  },
  async remove(): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      return;
    }
    await AsyncStorage.removeItem(STORAGE_KEY);
  },
};

interface AuthValue {
  ready: boolean;
  session: Session | null;
  user: SessionUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<Session>;
  register: (payload: RegisterPayload) => Promise<Session>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  const refreshing = useRef<Promise<string | null> | null>(null);

  const persist = useCallback(async (next: Session | null) => {
    if (next) {
      await storage.write(JSON.stringify(next));
    } else {
      await storage.remove();
    }
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    bindAuthBridge({
      accessToken: () => sessionRef.current?.access_token ?? null,
      refresh: () => {
        if (refreshing.current) {
          return refreshing.current;
        }
        const token = sessionRef.current?.refresh_token;
        if (!token) {
          return Promise.resolve(null);
        }
        const pending = (async () => {
          try {
            const next = await refreshSession(token);
            sessionRef.current = next;
            setSession(next);
            await persist(next);
            return next.access_token;
          } catch {
            sessionRef.current = null;
            setSession(null);
            await persist(null);
            return null;
          } finally {
            refreshing.current = null;
          }
        })();
        refreshing.current = pending;
        return pending;
      },
    });
    return () => bindAuthBridge(null);
  }, [persist]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await storage.read();
        if (!raw) {
          return;
        }
        const stored = JSON.parse(raw) as Session | null;
        if (!stored?.access_token || !stored?.refresh_token) {
          return;
        }
        if (active) {
          sessionRef.current = stored;
          setSession(stored);
        }
      } catch {
        await storage.remove().catch(() => undefined);
      } finally {
        if (active) {
          setReady(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const next = await loginRequest(email, password);
      sessionRef.current = next;
      setSession(next);
      await persist(next);
      return next;
    },
    [persist],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const next = await registerRequest(payload);
      sessionRef.current = next;
      setSession(next);
      await persist(next);
      return next;
    },
    [persist],
  );

  const logout = useCallback(async () => {
    const token = sessionRef.current?.refresh_token;
    if (token) {
      await logoutRequest(token).catch(() => undefined);
    }
    sessionRef.current = null;
    setSession(null);
    await persist(null);
  }, [persist]);

  const refreshUser = useCallback(async () => {
    const user = await fetchMe();
    setSession((current) => {
      if (!current) {
        return current;
      }
      const next = { ...current, user };
      sessionRef.current = next;
      void persist(next);
      return next;
    });
  }, [persist]);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      session,
      user: session?.user ?? null,
      isAuthenticated: session !== null,
      login,
      register,
      logout,
      refreshUser,
    }),
    [ready, session, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
