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
}

export interface ContactGridProps {
  contacts: Contact[];
  selectedId?: string;
  onSelect?: (contactId: string) => void;
  onView?: (id: string) => void;
  isLoading?: boolean;
}

export function ContactGrid({ contacts, selectedId, onSelect, onView, isLoading = false }: ContactGridProps) {
  if (contacts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
        No contacts created yet. Create your first contact below.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1rem',
      }}
    >
      {contacts.map((contact) => (
        <div
          key={contact._id}
          onClick={() => {
            if (isLoading) return;
            if (onSelect) onSelect(contact._id);
            else if (onView) onView(contact._id);
          }}
          style={{
            padding: '1rem',
            border: selectedId === contact._id ? '2px solid #0d6efd' : '1px solid #dee2e6',
            borderRadius: '8px',
            cursor: (isLoading || (!onSelect && !onView)) ? 'default' : 'pointer',
            backgroundColor: selectedId === contact._id ? '#f0f8ff' : '#fff',
            transition: 'all 0.2s',
            opacity: isLoading ? 0.6 : 1,
            position: 'relative',
          }}
          onMouseEnter={(e) => {
            if (!isLoading && (onSelect || onView) && selectedId !== contact._id) {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#0d6efd';
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(13,110,253,0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading && (onSelect || onView) && selectedId !== contact._id) {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#dee2e6';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }
          }}
        >
          <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{contact.name}</div>
          <div style={{ fontSize: '0.875rem', color: '#666', lineHeight: '1.4' }}>
            {contact.address.street}
            <br />
            {contact.address.city}, {contact.address.postalCode}
            <br />
            {contact.address.country}
          </div>

          {selectedId === contact._id && (
            <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
              <span style={{ color: '#0d6efd', fontWeight: '600', fontSize: '0.875rem' }}>
                ✓ Selected
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
