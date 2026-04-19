import { useState } from 'react';
import { Offer } from '../lib/schemas';
import { SendOfferDialog } from './Offer/SendOfferDialog';
import { useSendOfferJob } from '../hooks/useSendOfferJob';
import { KebabMenu, MenuItem } from './KebabMenu';

interface OfferTableProps {
  offers: Offer[];
  associationNames: Record<string, string>;
  seasonYears?: Record<string | number, string>;
  onView: (id: string) => void;
  onSend?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSendSuccess?: (driveLink: string) => void;
  onSendError?: (message: string) => void;
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
  onSend,
  onEdit,
  onDelete,
  onSendSuccess,
  onSendError,
  isLoading = false,
}: OfferTableProps) {
  const [sortBy, setSortBy] = useState<'createdAt' | 'seasonId' | 'status'>('createdAt');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const { status: jobStatus } = useSendOfferJob(selectedOffer?._id || null);

  const openSendDialog = (offer: any) => {
    setSelectedOffer(offer);
    setSendDialogOpen(true);
  };

  const handleSendSuccess = (driveLink: string) => {
    // Show success message with the drive link
    const message = `Offer sent! View it here: ${driveLink}`;
    console.log(message);
    setSendDialogOpen(false);
    onSendSuccess?.(driveLink);
    // Could trigger a refetch of offers here if needed
  };

  const handleSendError = (message: string) => {
    console.error('Send error:', message);
    onSendError?.(message);
  };

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
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'center', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)' }}>Actions</th>
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
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-secondary)', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', border: '1px solid var(--border-color)' }}>
                    {offer.leagueIds.length}
                  </div>
                </td>
                <td data-label="Status" style={{ padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-md)' }}>
                  <div style={statusBadgeStyle(offer.status)}>{offer.status}</div>
                </td>
                <td data-label="Actions" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
                  <KebabMenu
                    disabled={isLoading}
                    items={[
                      {
                        label: 'View',
                        onClick: () => onView(offer._id),
                      },
                      ...(offer.status === 'draft' && onEdit
                        ? [
                            {
                              label: 'Edit',
                              onClick: () => onEdit(offer._id),
                            } as MenuItem,
                          ]
                        : []),
                      ...(offer.status === 'draft'
                        ? [
                            {
                              label: 'Send',
                              onClick: () => openSendDialog(offer),
                            } as MenuItem,
                          ]
                        : []),
                      ...(offer.status === 'draft' && onDelete
                        ? [
                            {
                              label: 'Delete',
                              onClick: () => onDelete(offer._id),
                              danger: true,
                            } as MenuItem,
                          ]
                        : []),
                    ]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Send Offer Dialog */}
      <SendOfferDialog
        open={sendDialogOpen}
        offerId={selectedOffer?._id || ''}
        recipientEmail={selectedOffer?.contactId?.email || ''}
        recipientName={selectedOffer?.contactId?.name || ''}
        totalPrice={selectedOffer?.finalPrice || 0}
        onClose={() => setSendDialogOpen(false)}
        onSuccess={handleSendSuccess}
        onError={handleSendError}
      />
    </div>
  );
}
