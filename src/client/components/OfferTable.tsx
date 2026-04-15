import { useState } from 'react';
import { Offer } from '../lib/schemas';

interface OfferTableProps {
  offers: Offer[];
  associationNames: Record<string, string>;
  seasonYears?: Record<string | number, number>;
  onView: (id: string) => void;
  onSend?: (id: string) => void;
  onEdit?: (id: string) => void;
  isLoading?: boolean;
}

const statusBadgeStyle = (status: string): React.CSSProperties => {
  const colors: Record<string, { bg: string; color: string }> = {
    draft: { bg: 'var(--bg-secondary)', color: 'var(--text-muted)' },
    sent: { bg: '#eff6ff', color: '#0369a1' },
    accepted: { bg: '#ecfdf5', color: 'var(--success-color)' },
  };

  const colorSet = colors[status] || colors.draft;

  return {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    background: colorSet.bg,
    color: colorSet.color,
    borderRadius: 'var(--border-radius-sm)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    border: '1px solid currentColor',
    opacity: 0.8,
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
  seasonYears = {},
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

  if (filteredOffers.length === 0) {
    return (
      <div className="card" style={{
        padding: 'var(--spacing-xl)',
        textAlign: 'center',
        background: 'var(--bg-secondary)',
        color: 'var(--text-muted)',
      }}>
        <p>{filterStatus ? `No ${filterStatus} offers found.` : 'No offers found. Create one to get started.'}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter Buttons */}
      <div style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
        {[
          { label: 'All', value: null },
          { label: 'Draft', value: 'draft' },
          { label: 'Sent', value: 'sent' },
          { label: 'Accepted', value: 'accepted' },
        ].map(({ label, value }) => (
          <button
            key={label}
            onClick={() => setFilterStatus(value)}
            disabled={isLoading}
            className={`btn ${filterStatus === value ? 'btn-primary' : 'btn-outline'}`}
            style={{
              padding: '4px 12px',
              fontSize: 'var(--font-size-xs)',
              minHeight: '32px',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ opacity: isLoading ? 0.6 : 1, pointerEvents: isLoading ? 'none' : 'auto' }}>
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
              <th
                onClick={() => setSortBy('createdAt')}
                style={{
                  padding: 'var(--spacing-lg)',
                  textAlign: 'left',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  color: 'var(--text-main)',
                }}
              >
                Created {sortBy === 'createdAt' ? '↓' : ''}
              </th>
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-main)' }}>Association</th>
              <th
                onClick={() => setSortBy('seasonId')}
                style={{
                  padding: 'var(--spacing-lg)',
                  textAlign: 'left',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  color: 'var(--text-main)',
                }}
              >
                Season {sortBy === 'seasonId' ? '↓' : ''}
              </th>
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'center', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-main)' }}>Leagues</th>
              <th
                onClick={() => setSortBy('status')}
                style={{
                  padding: 'var(--spacing-lg)',
                  textAlign: 'left',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  color: 'var(--text-main)',
                }}
              >
                Status {sortBy === 'status' ? '↓' : ''}
              </th>
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'center', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-main)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedOffers.map((offer) => (
              <tr key={offer._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td data-label="Created" style={{ padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-md)', color: 'var(--text-main)' }}>{formatDate(offer.createdAt)}</td>
                <td data-label="Association" style={{ padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-md)' }}>
                  <strong style={{ color: 'var(--primary-color)' }}>{associationNames[offer.associationId] || 'Unknown'}</strong>
                </td>
                <td data-label="Season" style={{ padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-md)', color: 'var(--text-main)' }}>Season {seasonYears[offer.seasonId] || offer.seasonId}</td>
                <td data-label="Leagues" style={{ padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-md)', textAlign: 'center', color: 'var(--text-main)' }}>
                  {offer.leagueIds.length}
                </td>
                <td data-label="Status" style={{ padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-md)' }}>
                  <div style={statusBadgeStyle(offer.status)}>{offer.status}</div>
                </td>
                <td data-label="Actions" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-outline"
                      style={{ minHeight: '32px', padding: '4px 12px', fontSize: 'var(--font-size-xs)' }}
                      onClick={() => onView(offer._id)}
                      disabled={isLoading}
                    >
                      View
                    </button>
                    {offer.status === 'draft' && onSend && (
                      <button
                        className="btn btn-primary"
                        style={{ minHeight: '32px', padding: '4px 12px', fontSize: 'var(--font-size-xs)', background: 'var(--success-color)' }}
                        onClick={() => onSend(offer._id)}
                        disabled={isLoading}
                      >
                        Send
                      </button>
                    )}
                    {offer.status === 'draft' && onEdit && (
                      <button
                        className="btn btn-secondary"
                        style={{ minHeight: '32px', padding: '4px 12px', fontSize: 'var(--font-size-xs)', background: 'var(--warning-color)', color: '#000' }}
                        onClick={() => onEdit(offer._id)}
                        disabled={isLoading}
                      >
                        Edit
                      </button>
                    )}
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
