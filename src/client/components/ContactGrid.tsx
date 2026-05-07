// src/client/components/ContactGrid.tsx

export interface Contact {
  _id: string;
  name: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  email?: string;
}

export interface ContactGridProps {
  contacts: Contact[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export function ContactGrid({ contacts, onEdit, onDelete, isLoading = false }: ContactGridProps) {
  if (contacts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--border-color)' }}>
        No contacts created yet.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 'var(--spacing-lg)',
        opacity: isLoading ? 0.6 : 1,
        pointerEvents: isLoading ? 'none' : 'auto',
      }}
    >
      {contacts.map((contact) => (
        <div
          key={contact._id}
          onClick={() => onEdit(contact._id)}
          className="hoverable-row"
          style={{
            padding: 'var(--spacing-lg)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--border-radius-lg)',
            cursor: 'pointer',
            backgroundColor: 'var(--bg-primary)',
            transition: 'all var(--transition-normal)',
            position: 'relative',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
              <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--primary-color)', fontSize: 'var(--font-size-lg)' }}>
                {contact.name}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(contact._id);
                }}
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--danger-color)', padding: '4px', minWidth: 'auto', minHeight: 'auto' }}
                title="Delete Contact"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              {contact.address.street}<br />
              {contact.address.city}, {contact.address.postalCode}<br />
              {contact.address.country}
            </div>
          </div>
          <div style={{ marginTop: 'var(--spacing-md)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Click to edit
          </div>
        </div>
      ))}
    </div>
  );
}
