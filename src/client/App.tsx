import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ConfigDetailPage } from './pages/ConfigDetailPage';
import { ConfigNewPage } from './pages/ConfigNewPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { AssociationsPage } from './pages/AssociationsPage';
import { OffersPage } from './pages/OffersPage';
import { OfferDetailPage } from './pages/OfferDetailPage';
import { OfferCreateWizard } from './components/OfferCreateWizard';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { trpc } from './lib/trpc';

function DbDownScreen() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center', padding: '2rem' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔌</div>
      <h1 style={{ color: '#dc3545' }}>Database connection lost</h1>
      <p style={{ maxWidth: '500px', fontSize: '1.2rem', color: '#666' }}>
        The application is currently unable to connect to its primary database. 
        We are already trying to reconnect in the background.
      </p>
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
        <p style={{ margin: 0, fontWeight: 'bold', color: '#0d6efd' }}>Trying to reconnect...</p>
      </div>
      <button 
        onClick={() => window.location.reload()} 
        style={{ marginTop: '2rem', padding: '10px 20px', background: '#0d6efd', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}
      >
        Refresh Page
      </button>
    </div>
  );
}

export function App() {
  const health = trpc.health.check.useQuery(undefined, {
    refetchInterval: 5000,
    retry: true,
  });

  const isDbDown = health.data?.db === 'disconnected';

  return (
    <BrowserRouter>
      <div id="app-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <main style={{ flex: 1, display: 'flex' }}>
          {isDbDown ? (
            <DbDownScreen />
          ) : (
            <>
              <Navigation />
              <div style={{ flex: 1, marginLeft: '200px' }}>
                <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/login/callback" element={<AuthCallbackPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/config/new" element={<ConfigNewPage />} />
                <Route path="/config/:id" element={<ConfigDetailPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/offers/new" element={<OfferCreateWizard />} />
                <Route path="/offers/:id" element={<OfferDetailPage />} />
                <Route path="/offers" element={<OffersPage />} />
                <Route path="/associations" element={<AssociationsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </div>
            </>
          )}
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
