import { Link, useLocation } from 'react-router-dom';

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  fontWeight: 'var(--font-weight-semibold)',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  padding: '1.5rem 1rem 0.5rem 1rem',
  margin: 0,
};

const navItemStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  padding: '0.75rem 1rem',
  color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
  textDecoration: 'none',
  fontSize: 'var(--font-size-sm)',
  fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
  background: isActive ? 'var(--bg-secondary)' : 'transparent',
  borderRight: isActive ? '3px solid var(--primary-color)' : 'none',
  transition: 'all var(--transition-normal)',
});

const bottomNavItemStyle = (isActive: boolean): React.CSSProperties => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '2px',
  color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
  textDecoration: 'none',
  fontSize: '10px',
  fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
  transition: 'all var(--transition-normal)',
});

const bottomNavIcons: Record<string, string> = {
  '/dashboard': '📊',
  '/offers': '💼',
  '/config': '⚙️',
  '/associations': '🤝',
  '/contacts': '👤',
};

const bottomNavLabels: Record<string, string> = {
  '/dashboard': 'Home',
  '/offers': 'Offers',
  '/config': 'Config',
  '/associations': 'Assoc.',
  '/contacts': 'People',
};

export function Navigation() {
  const location = useLocation();

  const isActive = (path: string): boolean => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const navContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-primary)' }}>
      <div style={{ padding: '1.5rem 1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
        <h1 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--primary-color)' }}>
          Leagues Finance
        </h1>
      </div>

      <div style={{ flex: 1 }}>
        <Link to="/dashboard" style={navItemStyle(isActive('/dashboard'))}>
          <span style={{ marginRight: '10px' }}>📊</span> Dashboard
        </Link>

        <h3 style={sectionTitleStyle}>Finance</h3>
        <Link to="/offers" style={navItemStyle(isActive('/offers'))}>
          <span style={{ marginRight: '10px' }}>💼</span> Offers
        </Link>

        <h3 style={sectionTitleStyle}>Contacts</h3>
        <Link to="/associations" style={navItemStyle(isActive('/associations'))}>
          <span style={{ marginRight: '10px' }}>🤝</span> Associations
        </Link>
        <Link to="/contacts" style={navItemStyle(isActive('/contacts'))}>
          <span style={{ marginRight: '10px' }}>👤</span> People
        </Link>

        <h3 style={sectionTitleStyle}>System</h3>
        <Link to="/settings" style={navItemStyle(isActive('/settings'))}>
          <span style={{ marginRight: '10px' }}>⚡</span> Settings
        </Link>
        </div>
        </div>
        );
  const bottomNavPaths = ['/dashboard', '/offers', '/config', '/associations', '/contacts'];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        style={{
          width: '200px',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          borderRight: '1px solid var(--border-color)',
          background: 'var(--bg-primary)',
          zIndex: 100,
        }}
        id="nav-sidebar"
      >
        {navContent}
      </aside>

      {/* Mobile bottom navigation bar */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '64px',
          background: 'var(--bg-primary)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 1000,
          paddingBottom: 'env(safe-area-inset-bottom)',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
        }}
        id="mobile-bottom-nav"
      >
        {bottomNavPaths.map((path) => (
          <Link
            key={path}
            to={path}
            style={bottomNavItemStyle(isActive(path))}
          >
            <span style={{ fontSize: '1.25rem', marginBottom: '2px' }}>{bottomNavIcons[path]}</span>
            <span>{bottomNavLabels[path]}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
