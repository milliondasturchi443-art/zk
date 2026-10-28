import { Navigate, Outlet } from 'react-router';

import { ConfigErrorScreen } from '../components/HomeLayout';
import { LoadingState } from '../components/states';
import { useAuth } from '../lib/auth';

/** Requires a session; unauthenticated visitors are sent to /sign-in. */
export function RequireAuth() {
  const { session, isLoading, isConfigured, configError } = useAuth();

  if (!isConfigured) return <ConfigErrorScreen message={configError} />;
  if (isLoading) return <LoadingState label="Loading…" />;
  if (!session) return <Navigate to="/sign-in" replace />;
  return <Outlet />;
}

/** For the sign-in / sign-up / forgot-password screens: already signed in → home. */
export function AuthOnly() {
  const { session, isLoading, isConfigured, configError } = useAuth();

  if (!isConfigured) return <ConfigErrorScreen message={configError} />;
  if (isLoading) return null;
  if (session) return <Navigate to="/" replace />;
  return <Outlet />;
}
