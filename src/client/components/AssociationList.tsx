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
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        background: '#f8f9fa',
        borderRadius: 8,
        color: '#666',
      }}>
        <p>No associations found. Create one to get started.</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', ...statusStyle(isLoading) }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        background: '#fff',
      }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #dee2e6', background: '#f8f9fa' }}>
            <th style={{ padding: '1rem', textAlign: 'left', fontSize: 14, fontWeight: 600 }}>Name</th>
            <th style={{ padding: '1rem', textAlign: 'left', fontSize: 14, fontWeight: 600 }}>Email</th>
            <th style={{ padding: '1rem', textAlign: 'left', fontSize: 14, fontWeight: 600 }}>Phone</th>
            <th style={{ padding: '1rem', textAlign: 'center', fontSize: 14, fontWeight: 600 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {associations.map((association) => (
            <tr key={association._id} style={{ borderBottom: '1px solid #dee2e6' }}>
              <td style={{ padding: '1rem', fontSize: 14 }}>
                <strong>{association.name}</strong>
              </td>
              <td style={{ padding: '1rem', fontSize: 14 }}>{association.email}</td>
              <td style={{ padding: '1rem', fontSize: 14 }}>{association.phone}</td>
              <td style={{ padding: '1rem', textAlign: 'center' }}>
                <button
                  onClick={() => onEdit(association._id)}
                  disabled={isLoading}
                  style={{
                    padding: '0.4rem 0.8rem',
                    background: '#0d6efd',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                    marginRight: '0.5rem',
                  }}
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${association.name}"?`)) {
                      onDelete(association._id);
                    }
                  }}
                  disabled={isLoading}
                  style={{
                    padding: '0.4rem 0.8rem',
                    background: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 4,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: 12,
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
