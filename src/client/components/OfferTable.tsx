import { useState } from 'react';
import { Offer } from '../lib/schemas';

interface OfferTableProps {
  offers: Offer[];
  associationNames: Record<string, string>;
  onView: (id: string) => void;
  onSend?: (id: string) => void;
  onEdit?: (id: string) => void;
  isLoading?: boolean;
}

const statusBadgeStyle = (status: string): React.CSSProperties => {
  const colors: Record<string, { bg: string; color: string }> = {
    DRAFT: { bg: '#e9ecef', color: '#495057' },
    SENT: { bg: '#cfe2ff', color: '#084298' },
    VIEWED: { bg: '#fff3cd', color: '#997404' },
    NEGOTIATING: { bg: '#ffe5cc', color: '#cc5200' },
    ACCEPTED: { bg: '#d1e7dd', color: '#0f5132' },
    REJECTED: { bg: '#f8d7da', color: '#842029' },
  };

  const colorSet = colors[status] || colors.DRAFT;

  return {
    display: 'inline-block',
    padding: '0.35rem 0.65rem',
    background: colorSet.bg,
    color: colorSet.color,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 500,
  };
};

const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString();
};

const formatPrice = (price: number): string => `$${price.toFixed(2)}`;

export function OfferTable({
  offers,
  associationNames,
  onView,
  onSend,
  onEdit,
  isLoading = false,
}: OfferTableProps) {
  const [sortBy, setSortBy] = useState<'createdAt' | 'seasonId' | 'status'>('createdAt');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const filteredOffers = filterStatus
    ? offers.filter((o) => o.status === filterStatus)
    : offers;

  const sortedOffers = [...filteredOffers].sort((a, b) => {
    if (sortBy === 'createdAt') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'seasonId') {
      return b.seasonId - a.seasonId;
    }
    if (sortBy === 'status') {
      return a.status.localeCompare(b.status);
    }
    return 0;
  });

  // Calculate totals for filtered offers
  const totalPrice = filteredOffers.reduce((sum, offer) => {
    // This is just an estimate since we don't have line items here
    // In a real app, you'd pass line items or get totals from server
    return sum;
  }, 0);

  if (filteredOffers.length === 0) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        background: '#f8f9fa',
        borderRadius: 8,
        color: '#666',
      }}>
        <p>{filterStatus ? `No ${filterStatus} offers found.` : 'No offers found. Create one to get started.'}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter Buttons */}
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'All', value: null },
          { label: 'Draft', value: 'DRAFT' },
          { label: 'Sent', value: 'SENT' },
          { label: 'Viewed', value: 'VIEWED' },
          { label: 'Negotiating', value: 'NEGOTIATING' },
          { label: 'Accepted', value: 'ACCEPTED' },
          { label: 'Rejected', value: 'REJECTED' },
        ].map(({ label, value }) => (
          <button
            key={label}
            onClick={() => setFilterStatus(value)}
            disabled={isLoading}
            style={{
              padding: '0.4rem 0.8rem',
              background: filterStatus === value ? '#0d6efd' : '#fff',
              color: filterStatus === value ? '#fff' : '#0d6efd',
              border: '1px solid #0d6efd',
              borderRadius: 4,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', opacity: isLoading ? 0.6 : 1, pointerEvents: isLoading ? 'none' : 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          background: '#fff',
        }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #dee2e6', background: '#f8f9fa' }}>
              <th
                onClick={() => setSortBy('createdAt')}
                style={{
                  padding: '1rem',
                  textAlign: 'left',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                Created {sortBy === 'createdAt' ? '↓' : ''}
              </th>
              <th style={{ padding: '1rem', textAlign: 'left', fontSize: 14, fontWeight: 600 }}>Association</th>
              <th
                onClick={() => setSortBy('seasonId')}
                style={{
                  padding: '1rem',
                  textAlign: 'left',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                Season {sortBy === 'seasonId' ? '↓' : ''}
              </th>
              <th style={{ padding: '1rem', textAlign: 'center', fontSize: 14, fontWeight: 600 }}>Leagues</th>
              <th
                onClick={() => setSortBy('status')}
                style={{
                  padding: '1rem',
                  textAlign: 'left',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                Status {sortBy === 'status' ? '↓' : ''}
              </th>
              <th style={{ padding: '1rem', textAlign: 'center', fontSize: 14, fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedOffers.map((offer) => (
              <tr key={offer._id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '1rem', fontSize: 14 }}>{formatDate(offer.createdAt)}</td>
                <td style={{ padding: '1rem', fontSize: 14 }}>
                  <strong>{associationNames[offer.associationId] || 'Unknown'}</strong>
                </td>
                <td style={{ padding: '1rem', fontSize: 14 }}>Season {offer.seasonId}</td>
                <td style={{ padding: '1rem', fontSize: 14, textAlign: 'center' }}>
                  {offer.selectedLeagueIds.length}
                </td>
                <td style={{ padding: '1rem', fontSize: 14 }}>
                  <div style={statusBadgeStyle(offer.status)}>{offer.status}</div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <button
                    onClick={() => onView(offer._id)}
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
                    View
                  </button>
                  {offer.status === 'DRAFT' && onSend && (
                    <button
                      onClick={() => onSend(offer._id)}
                      disabled={isLoading}
                      style={{
                        padding: '0.4rem 0.8rem',
                        background: '#198754',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontSize: 12,
                        marginRight: '0.5rem',
                      }}
                    >
                      Send
                    </button>
                  )}
                  {offer.status === 'DRAFT' && onEdit && (
                    <button
                      onClick={() => onEdit(offer._id)}
                      disabled={isLoading}
                      style={{
                        padding: '0.4rem 0.8rem',
                        background: '#ffc107',
                        color: '#000',
                        border: 'none',
                        borderRadius: 4,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        fontSize: 12,
                      }}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
