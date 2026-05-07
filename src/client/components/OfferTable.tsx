import { useState } from 'react';
import { Offer } from '../lib/schemas';

interface OfferTableProps {
  offers: Offer[];
  associationNames: Record<string, string>;
  seasonYears?: Record<string | number, string>;
  onView: (id: string) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

const statusBadgeStyle = (status: string): React.CSSProperties => {
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    draft: { bg: 'var(--bg-secondary)', color: 'var(--text-muted)', border: 'var(--border-color)' },
    sent: { bg: '#eff6ff', color: '#0369a1', border: '#bae6fd' },
    accepted: { bg: '#ecfdf5', color: 'var(--success-color)', border: 'var(--success-color)' },
  };

  const colorSet = colors[status] || colors.draft;

  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    background: colorSet.bg,
    color: colorSet.color,
    borderRadius: 'var(--border-radius-md)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    border: `1px solid ${colorSet.border}`,
    textTransform: 'capitalize',
  };
};

const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString();
};

export function OfferTable({
  offers,
  associationNames,
  seasonYears = {},
  onView,
  onDelete,
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
            className={`chip ${filterStatus === value ? 'active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ opacity: isLoading ? 0.6 : 1, pointerEvents: isLoading ? 'none' : 'auto' }}>
        <table className="mobile-cards-table" style={{
          width: '100%',
          borderCollapse: 'separate',
          borderSpacing: 0,
          background: 'var(--bg-primary)',
          borderRadius: 'var(--border-radius-lg)',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid var(--border-color)',
        }}>
          <thead style={{ background: 'var(--bg-secondary)' }}>
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
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                Created {sortBy === 'createdAt' ? '↓' : ''}
              </th>
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)' }}>Association</th>
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
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                Season {sortBy === 'seasonId' ? '↓' : ''}
              </th>
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'center', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)' }}>Leagues</th>
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
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                Status {sortBy === 'status' ? '↓' : ''}
              </th>
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'center', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)' }}>Delete</th>
            </tr>
          </thead>
          <tbody>
            {sortedOffers.map((offer) => (
              <tr 
                key={offer._id} 
                onClick={() => onView(offer._id)}
                className="hoverable-row"
                style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
              >
                <td data-label="Created" style={{ padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-md)', color: 'var(--text-main)' }}>{formatDate(offer.createdAt)}</td>
                <td data-label="Association" style={{ padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-md)' }}>
                  <strong style={{ color: 'var(--primary-color)' }}>{associationNames[offer.associationId] || 'Unknown'}</strong>
                </td>
                <td data-label="Season" style={{ padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-md)', color: 'var(--text-main)' }}>Season {seasonYears[offer.seasonId] || offer.seasonId}</td>
                <td data-label="Leagues" style={{ padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-md)', textAlign: 'center', color: 'var(--text-main)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-secondary)', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', border: '1px solid var(--border-color)' }}>
                    {offer.leagueIds.length}
                  </div>
                </td>
                <td data-label="Status" style={{ padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-md)' }}>
                  <div style={statusBadgeStyle(offer.status)}>{offer.status}</div>
                </td>
                <td data-label="Delete" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
                  {offer.status === 'draft' && onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(offer._id);
                      }}
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger-color)', padding: '4px', minWidth: 'auto', minHeight: 'auto' }}
                      title="Delete Offer"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
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
