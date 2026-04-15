import { Association } from '../lib/schemas';

interface AssociationListProps {
  associations: Association[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

const statusStyle = (isLoading?: boolean): React.CSSProperties => ({
  opacity: isLoading ? 0.6 : 1,
  pointerEvents: isLoading ? 'none' : 'auto',
});

export function AssociationList({ associations, onEdit, onDelete, isLoading = false }: AssociationListProps) {
  if (associations.length === 0) {
    return (
      <div className="card" style={{
        padding: 'var(--spacing-xl)',
        textAlign: 'center',
        background: 'var(--bg-secondary)',
        color: 'var(--text-muted)',
      }}>
        <p>No associations found. Create one to get started.</p>
      </div>
    );
  }

  return (
    <div style={{ ...statusStyle(isLoading) }}>
      <table className="mobile-cards-table" style={{
        width: '100%',
        borderCollapse: 'collapse',
        background: 'var(--bg-primary)',
        borderRadius: 'var(--border-radius-lg)',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}>
        <thead style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
          <tr>
            <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-main)' }}>Name</th>
            <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-main)' }}>Address</th>
            <th style={{ padding: 'var(--spacing-lg)', textAlign: 'center', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-main)' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {associations.map((association) => (
            <tr key={association._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td data-label="Name" style={{ padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-md)' }}>
                <strong style={{ color: 'var(--primary-color)' }}>{association.name}</strong>
              </td>
              <td data-label="Address" style={{ padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-md)', color: 'var(--text-main)' }}>
                {association.address ? (
                  <>
                    {association.address.street}, {association.address.postalCode} {association.address.city}, {association.address.country}
                  </>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>No address</span>
                )}
              </td>
              <td data-label="Actions" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'center' }}>
                  <button
                    className="btn btn-primary"
                    style={{ minHeight: '32px', padding: '4px 12px', fontSize: 'var(--font-size-xs)' }}
                    onClick={() => onEdit(association._id)}
                    disabled={isLoading}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-secondary"
                    style={{ minHeight: '32px', padding: '4px 12px', fontSize: 'var(--font-size-xs)', background: 'var(--danger-color)' }}
                    onClick={() => {
                      if (window.confirm(`Delete "${association.name}"?`)) {
                        onDelete(association._id);
                      }
                    }}
                    disabled={isLoading}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
