import { Navigate, Outlet } from 'react-router-dom';
import { trpc } from '../lib/trpc';

export function ProtectedRoute() {
  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
  });

  if (isLoading) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
