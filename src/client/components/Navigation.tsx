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

const bottomNavItemStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.5rem',
  color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
  textDecoration: 'none',
  fontSize: 'var(--font-size-xs)',
  transition: 'all var(--transition-normal)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  minWidth: '60px',
});

const bottomNavIcons: Record<string, string> = {
  '/dashboard': '📊',
  '/config': '⚙️',
  '/associations': '🤝',
  '/offers': '💼',
  '/settings': '⚡',
};

const bottomNavLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/config': 'Config',
  '/associations': 'Assoc.',
  '/offers': 'Offers',
  '/settings': 'Settings',
};

export function Navigation() {
  const location = useLocation();

  const isActive = (path: string): boolean => {
    return location.pathname.startsWith(path);
  };

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

  const bottomNavPaths = ['/dashboard', '/config', '/associations', '/offers', '/settings'];

  return (
    <>
      {/* Desktop sidebar */}
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
        }}
        id="nav-sidebar"
      >
        {navContent}
      </nav>

      {/* Mobile bottom navigation bar */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '64px',
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 1000,
          paddingBottom: 'env(safe-area-inset-bottom)',
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