import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { Session, User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router';

import { logDiagnostic } from './errors';
import { requireSupabase, supabaseConfigError } from './supabase';

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  configError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ needsEmailVerification: boolean }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  verifyCurrentPassword: (password: string) => Promise<boolean>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Where emailed links land: the current origin (works on Render and in the app shell). */
function redirectTo(path: string): string {
  return `${window.location.origin}${path}`;
}

/** True when the current URL carries a password-recovery flag (query or hash). */
function isRecoveryUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.get('type') === 'recovery') return true;
    const hash = parsed.hash.replace(/^#/, '');
    if (!hash) return false;
    return new URLSearchParams(hash).get('type') === 'recovery';
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const recoveryHandled = useRef(false);
  const isConfigured = supabaseConfigError === null;
  const navigate = useNavigate();

  useEffect(() => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }
    const client = requireSupabase();

    let mounted = true;

    client.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setSession(data.session);
      })
      .catch((error) => logDiagnostic('get-session', error))
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    const { data: subscription } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // The recovery link lands with ?type=recovery (PKCE) or #type=recovery;
      // once the session is established, move to the password reset screen.
      if (next && !recoveryHandled.current && isRecoveryUrl(window.location.href)) {
        recoveryHandled.current = true;
        navigate('/reset-password', { replace: true });
      }
    });

    // Keep tokens fresh while the tab is visible (web equivalent of AppState).
    const onVisibility = () => {
      if (document.visibilityState === 'visible') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    };
    document.addEventListener('visibilitychange', onVisibility);
    client.auth.startAutoRefresh();

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      client.auth.stopAutoRefresh();
    };
  }, [isConfigured, navigate]);

  const value = useMemo<AuthContextValue>(() => {
    const signIn = async (email: string, password: string) => {
      const client = requireSupabase();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setSession(data.session);
    };

    const signUp = async (input: SignUpInput) => {
      const client = requireSupabase();
      const { data, error } = await client.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: { full_name: input.fullName },
          emailRedirectTo: redirectTo('/'),
        },
      });
      if (error) throw error;
      if (data.session) setSession(data.session);
      return { needsEmailVerification: !data.session };
    };

    const signOut = async () => {
      const client = requireSupabase();
      const { error } = await client.auth.signOut();
      if (error) throw error;
      setSession(null);
    };

    const sendPasswordReset = async (email: string) => {
      const client = requireSupabase();
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: redirectTo('/reset-password'),
      });
      if (error) throw error;
    };

    const updatePassword = async (newPassword: string) => {
      const client = requireSupabase();
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) throw error;
    };

    const verifyCurrentPassword = async (password: string) => {
      const client = requireSupabase();
      const email = session?.user.email;
      if (!email) return false;
      const { error } = await client.auth.signInWithPassword({ email, password });
      return !error;
    };

    const refreshSession = async () => {
      const client = requireSupabase();
      const { data, error } = await client.auth.refreshSession();
      if (error) throw error;
      setSession(data.session);
    };

    return {
      session,
      user: session?.user ?? null,
      isLoading,
      isConfigured,
      configError: supabaseConfigError,
      signIn,
      signUp,
      signOut,
      sendPasswordReset,
      updatePassword,
      verifyCurrentPassword,
      refreshSession,
    };
  }, [session, isLoading, isConfigured]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
