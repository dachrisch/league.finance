import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { trpc } from '../lib/trpc';

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
  });

  useEffect(() => {
    if (user && !isLoading) navigate('/dashboard', { replace: true });
  }, [user, isLoading, navigate]);

  const error = params.get('error');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: 'var(--spacing-xl)', color: 'var(--primary-color)', fontSize: '2rem' }}>Leagues Finance</h1>
      {error === 'domain' && (
        <p style={{ color: 'var(--danger-color)', marginBottom: 'var(--spacing-md)' }}>Only @bumbleflies.de accounts are allowed.</p>
      )}
      <a
        href="/auth/google"
        className="btn btn-primary"
        style={{ background: '#4285f4' }}
      >
        Sign in with Google
      </a>
    </div>
  );
}
