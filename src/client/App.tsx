import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ConfigDetailPage } from './pages/ConfigDetailPage';
import { ConfigNewPage } from './pages/ConfigNewPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { AssociationsPage } from './pages/AssociationsPage';
import { ContactsPage } from './pages/ContactsPage';
import { OffersPage } from './pages/OffersPage';
import { OfferDetailPage } from './pages/OfferDetailPage';
import OfferNewPage from './pages/OfferNewPage';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { trpc } from './lib/trpc';

function DbDownScreen() {
  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-lg)' }}>🔌</div>
      <h1 style={{ color: 'var(--danger-color)', marginBottom: 'var(--spacing-md)' }}>Database connection lost</h1>
      <p style={{ maxWidth: '500px', fontSize: 'var(--font-size-xl)', color: 'var(--text-muted)' }}>
        The application is currently unable to connect to its primary database. 
        We are already trying to reconnect in the background.
      </p>
      <div className="card" style={{ marginTop: 'var(--spacing-xl)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <p style={{ margin: 0, fontWeight: 'var(--font-weight-semibold)', color: 'var(--primary-color)' }}>Trying to reconnect...</p>
      </div>
      <button 
        className="btn btn-primary"
        onClick={() => window.location.reload()} 
        style={{ marginTop: 'var(--spacing-xl)' }}
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
        <main style={{ flex: 1, display: 'flex' }} className="app-main">
          {isDbDown ? (
            <DbDownScreen />
          ) : (
            <>
              <Navigation />
              <div style={{ flex: 1, position: 'relative' }} className="main-content">
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/login/callback" element={<AuthCallbackPage />} />
                  <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/offers/new" element={<OfferNewPage />} />
                    <Route path="/offers/:id/edit" element={<OfferNewPage />} />
                    <Route path="/offers/:id" element={<OfferDetailPage />} />
                    <Route path="/offers" element={<OffersPage />} />
                    <Route path="/associations" element={<AssociationsPage />} />
                    <Route path="/contacts" element={<ContactsPage />} />
                  </Route>
                  <Route path="/config*" element={<Navigate to="/dashboard" replace />} />
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
