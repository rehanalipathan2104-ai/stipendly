import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Profile } from './types';
import { api, getToken, setToken, clearToken } from './api';

interface AuthState {
  session: { token: string } | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: 'student' | 'provider') => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const existing = getToken();
    if (!existing) {
      setLoading(false);
      return;
    }
    setTokenState(existing);
    api.getMe()
      .then(({ profile: p }) => setProfile(p))
      .catch(() => {
        clearToken();
        setTokenState(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session: token ? { token } : null,
      profile,
      loading,
      async signUp(email, password, fullName, role) {
        try {
          const { token: newToken, profile: p } = await api.signUp(email, password, fullName, role);
          setToken(newToken);
          setTokenState(newToken);
          setProfile(p);
          return { error: null };
        } catch (err) {
          return { error: err instanceof Error ? err.message : 'Sign up failed' };
        }
      },
      async signIn(email, password) {
        try {
          const { token: newToken, profile: p } = await api.signIn(email, password);
          setToken(newToken);
          setTokenState(newToken);
          setProfile(p);
          return { error: null };
        } catch (err) {
          return { error: err instanceof Error ? err.message : 'Sign in failed' };
        }
      },
      signOut() {
        clearToken();
        setTokenState(null);
        setProfile(null);
      },
      async refreshProfile() {
        if (!profile) return;
        try {
          const { profile: p } = await api.getProfile(profile.id);
          setProfile(p);
        } catch {
          // ignore
        }
      },
    }),
    [token, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
