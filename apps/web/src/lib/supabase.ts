import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Configuration problems are surfaced as a readable screen instead of a crash:
 * the auth guard checks `supabaseConfigError` before mounting any route.
 */
export const supabaseConfigError: string | null = !url
  ? 'VITE_SUPABASE_URL is not set. Copy .env.example to .env and restart the dev server.'
  : !anonKey
    ? 'VITE_SUPABASE_ANON_KEY is not set. Copy .env.example to .env and restart the dev server.'
    : null;

function buildClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: {
      // Web keeps the session in localStorage; PKCE + URL detection handle
      // the email confirmation and password recovery redirects.
      storage: window.localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      headers: { 'x-application-name': 'zk-web' },
    },
  });
}

export const supabase: SupabaseClient | null = buildClient();

/** Throws a descriptive error instead of an undefined dereference. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(supabaseConfigError ?? 'Supabase client is not initialised');
  }
  return supabase;
}

export const isSupabaseConfigured = Boolean(supabase);
