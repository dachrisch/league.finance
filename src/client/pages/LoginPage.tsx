import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';

export function LoginPage() {
  const navigate = useNavigate();
  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
  });

  useEffect(() => {
    if (user && !isLoading) navigate('/dashboard', { replace: true });
  }, [user, isLoading, navigate]);

  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1>Leagues Finance</h1>
      {error === 'domain' && (
        <p style={{ color: 'red' }}>Only @bumbleflies.de accounts are allowed.</p>
      )}
      <a
        href="/auth/google"
        style={{
          display: 'inline-block',
          padding: '12px 24px',
          background: '#4285f4',
          color: '#fff',
          borderRadius: 4,
          textDecoration: 'none',
          fontWeight: 'bold',
        }}
      >
        Sign in with Google
      </a>
    </div>
  );
}
