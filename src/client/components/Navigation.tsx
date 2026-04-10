import { Link, useLocation } from 'react-router-dom';

const navItemStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'block',
  padding: '0.75rem 1rem',
  color: isActive ? '#0d6efd' : '#666',
  textDecoration: 'none',
  borderLeft: isActive ? '3px solid #0d6efd' : '3px solid transparent',
  borderRadius: 0,
  fontSize: 14,
  transition: 'all 0.2s',
  fontWeight: isActive ? 600 : 400,
});

export function Navigation() {
  const location = useLocation();

  const isActive = (path: string): boolean => {
    return location.pathname.startsWith(path);
  };

  return (
    <nav style={{
      background: '#f8f9fa',
      borderRight: '1px solid #dee2e6',
      minHeight: '100vh',
      width: '200px',
      position: 'fixed',
      left: 0,
      top: 0,
      overflowY: 'auto',
      paddingTop: '1rem',
    }}>
      <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: 12, textTransform: 'uppercase', color: '#999' }}>Main</h3>
        <Link to="/dashboard" style={navItemStyle(isActive('/dashboard') && !isActive('/config'))}>
          Dashboard
        </Link>
      </div>

      <div style={{ padding: '0 1rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: 12, textTransform: 'uppercase', color: '#999' }}>Finance</h3>
        <Link to="/config/new" style={navItemStyle(isActive('/config'))}>
          Financial Config
        </Link>
        <Link to="/associations" style={navItemStyle(isActive('/associations'))}>
          Associations
        </Link>
        <Link to="/offers" style={navItemStyle(isActive('/offers'))}>
          Pricing Offers
        </Link>
      </div>

      <div style={{ padding: '0 1rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: 12, textTransform: 'uppercase', color: '#999' }}>Settings</h3>
        <Link to="/settings" style={navItemStyle(isActive('/settings'))}>
          Settings
        </Link>
      </div>
    </nav>
  );
}
