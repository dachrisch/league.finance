import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItemStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  padding: '0.75rem 1rem',
  color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
  textDecoration: 'none',
  borderLeft: isActive ? '3px solid var(--primary-color)' : '3px solid transparent',
  backgroundColor: isActive ? 'rgba(26, 26, 46, 0.05)' : 'transparent',
  fontSize: 'var(--font-size-md)',
  transition: 'all var(--transition-normal)',
  fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
});

const sectionTitleStyle: React.CSSProperties = {
  margin: '1.5rem 0 0.5rem 0',
  padding: '0 1rem',
  fontSize: 'var(--font-size-xs)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  fontWeight: 'var(--font-weight-semibold)',
};

export function Navigation() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string): boolean => {
    return location.pathname.startsWith(path);
  };

  // Close menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle body scroll locking on mobile
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add('mobile-menu-open');
    } else {
      document.body.classList.remove('mobile-menu-open');
    }
  }, [mobileMenuOpen]);

  // Update sidebar and backdrop classes when menu state changes
  useEffect(() => {
    const sidebar = document.getElementById('nav-sidebar');
    const backdrop = document.getElementById('mobile-menu-backdrop');
    if (mobileMenuOpen) {
      sidebar?.classList.add('mobile-menu-open');
      backdrop?.classList.add('mobile-menu-open');
    } else {
      sidebar?.classList.remove('mobile-menu-open');
      backdrop?.classList.remove('mobile-menu-open');
    }
  }, [mobileMenuOpen]);

  const navContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1.5rem 1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--primary-color)' }}>
          Leagues Finance
        </h1>
      </div>

      <div style={{ flex: 1 }}>
        <h3 style={sectionTitleStyle}>Main</h3>
        <Link to="/dashboard" style={navItemStyle(isActive('/dashboard') && !isActive('/config'))}>
          Dashboard
        </Link>

        <h3 style={sectionTitleStyle}>Finance</h3>
        <Link to="/config/new" style={navItemStyle(isActive('/config'))}>
          Financial Config
        </Link>
        <Link to="/associations" style={navItemStyle(isActive('/associations'))}>
          Associations
        </Link>
        <Link to="/offers" style={navItemStyle(isActive('/offers'))}>
          Pricing Offers
        </Link>

        <h3 style={sectionTitleStyle}>System</h3>
        <Link to="/settings" style={navItemStyle(isActive('/settings'))}>
          Settings
        </Link>
      </div>
      
      <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
        v0.1.9
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{
          position: 'fixed',
          top: '0.75rem',
          left: '0.75rem',
          zIndex: 1001,
          background: 'var(--primary-color)',
          color: '#fff',
          border: 'none',
          width: '40px',
          height: '40px',
          borderRadius: 'var(--border-radius-md)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
        id="mobile-menu-button"
        aria-label="Toggle navigation menu"
      >
        {mobileMenuOpen ? '✕' : '☰'}
      </button>

      {/* Backdrop for mobile menu */}
      <div
        className={mobileMenuOpen ? 'mobile-menu-open' : ''}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 998,
          display: 'none',
          backdropFilter: 'blur(2px)',
          transition: 'opacity var(--transition-normal)',
        }}
        id="mobile-menu-backdrop"
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Navigation sidebar */}
      <nav
        style={{
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          height: '100vh',
          width: '200px',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 999,
          overflowY: 'auto',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        id="nav-sidebar"
      >
        {navContent}
      </nav>
    </>
  );
}
