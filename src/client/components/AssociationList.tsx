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
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="mobile-cards-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
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
                    <span style={{ fontSize: 'var(--font-size-sm)' }}>
                      {association.address.street}, {association.address.postalCode} {association.address.city}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>No address</span>
                  )}
                </td>
                <td data-label="Actions" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'center' }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => onEdit(association._id)}
                      disabled={isLoading}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
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
    </div>
  );
}
