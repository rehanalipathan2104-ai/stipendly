import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile } from './types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, role: 'student' | 'provider') => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (error) {
      console.error('profile load error', error);
      return;
    }
    if (!data) {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (user) {
        const fullName = (user.user_metadata?.full_name as string) || (user.email?.split('@')[0] ?? '');
        const userRole = (user.user_metadata?.role as string) || 'student';
        await supabase.rpc('handle_new_user', {
          p_user_id: user.id,
          p_email: user.email ?? '',
          p_full_name: fullName,
          p_role: userRole,
        });
        const { data: retry } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
        setProfile(retry as Profile | null);
        return;
      }
    }
    setProfile(data as Profile | null);
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) {
        loadProfile(data.session.user.id).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      (async () => {
        setSession(newSession);
        if (newSession) {
          await loadProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      loading,
      async signUp(email, password, fullName, role) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, role } },
        });
        if (error) return { error: error.message };
        if (data.user) {
          await supabase.rpc('handle_new_user', {
            p_user_id: data.user.id,
            p_email: email,
            p_full_name: fullName,
            p_role: role,
          });
          await loadProfile(data.user.id);
        }
        return { error: null };
      },
      async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        if (data.user) {
          await loadProfile(data.user.id);
        }
        return { error: null };
      },
      async signOut() {
        await supabase.auth.signOut();
        setProfile(null);
        setSession(null);
      },
      async refreshProfile() {
        if (session?.user.id) await loadProfile(session.user.id);
      },
    }),
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
