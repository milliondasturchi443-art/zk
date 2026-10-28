// @vitest-environment happy-dom
/**
 * DOM smoke tests for the web client: renders the real router + auth tree and
 * asserts on visible text (the project's no-screenshot verification rule).
 */
import type { Session } from '@supabase/supabase-js';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.VITE_SUPABASE_URL = 'https://example.supabase.co';
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const FAKE_SESSION = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: {
    id: '00000000-0000-4000-8000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'student@example.com',
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: 'Test Student' },
    identities: [],
    is_anonymous: false,
  },
} as unknown as Session;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

async function renderApp(initialPath = '/'): Promise<HTMLDivElement> {
  window.history.pushState({}, '', initialPath);

  const [{ default: App }, { AuthProvider }, router, query] = await Promise.all([
    import('../App'),
    import('../lib/auth'),
    import('react-router'),
    import('@tanstack/react-query'),
  ]);

  const queryClient = new query.QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  await act(async () => {
    root!.render(
      <query.QueryClientProvider client={queryClient}>
        <router.BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </router.BrowserRouter>
      </query.QueryClientProvider>,
    );
  });
  // Flush pending auth/query promises so fallbacks settle.
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });

  return container;
}

async function stubSignedInSession(): Promise<void> {
  const { requireSupabase } = await import('../lib/supabase');
  const supabase = requireSupabase();
  vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
    data: { session: FAKE_SESSION },
    error: null,
  } as never);
  vi.spyOn(supabase.auth, 'onAuthStateChange').mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  } as never);
}

function text(): string {
  return container?.textContent ?? '';
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  container?.remove();
  root = null;
  container = null;
  vi.restoreAllMocks();
});

describe('web client smoke', () => {
  it('shows the sign-in screen for visitors', async () => {
    await renderApp('/');

    expect(text()).toContain('Login / Sign In');
    expect(text()).toContain('Forgot Password?');
    expect(text()).toContain('Sign Up');
  });

  it('renders the home tab for a signed-in student', async () => {
    await stubSignedInSession();
    await renderApp('/');

    expect(text()).toContain('SAT English');
    expect(text()).toContain('SAT Math');
    expect(text()).toContain('questions attempted');
    expect(text()).toContain('not College Board SAT scores');
  });

  it('renders the practice screen with filters and session list', async () => {
    await stubSignedInSession();
    await renderApp('/practice');

    expect(text()).toContain('Build a set from published questions');
    expect(text()).toContain('Start practice');
    expect(text()).toContain('Recent sessions');
    expect(text()).toContain('Feedback');
  });

  it('keeps protected screens behind the auth guard', async () => {
    await renderApp('/progress');

    expect(text()).toContain('Login / Sign In');
  });

  it('shows the not-found screen for unknown routes', async () => {
    await stubSignedInSession();
    await renderApp('/definitely-not-a-route');

    expect(text()).toContain('This screen does not exist');
    expect(text()).toContain('Go to home');
  });
});
