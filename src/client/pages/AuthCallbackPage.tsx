import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Token is now in HttpOnly cookie, automatically sent with all requests
    // Redirect to dashboard - authentication will be verified by tRPC via cookie
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  return <p>Signing you in…</p>;
}
