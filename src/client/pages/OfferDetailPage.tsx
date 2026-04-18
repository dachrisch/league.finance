import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { SendOfferDialog } from '../components/Offer/SendOfferDialog';

const statusBadgeStyle = (status: string): React.CSSProperties => {
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    draft: { bg: 'var(--bg-secondary)', color: 'var(--text-muted)', border: 'var(--border-color)' },
    sending: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
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
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatPrice = (price: number): string => `${price.toFixed(2)} €`;

export function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editingPrice, setEditingPrice] = useState<number | null>(null);
  const [editingLeagueId, setEditingLeagueId] = useState<number | null>(null);
  const [showSendDialog, setShowSendDialog] = useState(false);

  if (!id) {
    return <div className="container">Offer not found.</div>;
  }

  const { data, isLoading, refetch } = trpc.finance.offers.get.useQuery({ id });
  const { data: association } = trpc.finance.associations.get.useQuery(
    data?.offer?.associationId ? { id: data.offer.associationId.toString() } : { id: '' },
    { enabled: !!data?.offer?.associationId }
  );
  const { data: seasons = [] } = trpc.finance.seasons.list.useQuery();

  const markSent = trpc.finance.offers.markSent.useMutation({
    onSuccess: () => refetch(),
  });

  const markAccepted = trpc.finance.offers.markAccepted.useMutation({
    onSuccess: () => refetch(),
  });

  const updateConfig = trpc.finance.offers.updateConfig.useMutation({
    onSuccess: () => {
      setEditingLeagueId(null);
      setEditingPrice(null);
      refetch();
    },
    onError: (error) => {
      alert(`Failed to save price: ${error.message}`);
    },
  });

  if (isLoading) {
    return <div className="container"><p>Loading offer...</p></div>;
  }

  if (!data) {
    return (
      <div className="container">
        <p>Offer not found.</p>
        <button className="btn btn-primary" onClick={() => navigate('/offers')}>
          Back to Offers
        </button>
      </div>
    );
  }

  const offer = data.offer;
  const configs = data.configs || [];
  const totalPrice = configs.reduce((sum, config) => sum + config.finalPrice, 0);
  const season = seasons.find(s => s._id === offer.seasonId);
  const seasonYear = season?.year || offer.seasonId;

  return (
    <div className="container" style={{ paddingBottom: 'var(--spacing-xl)' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--spacing-lg)' }}>
          <div>
            <h1 style={{ margin: 0, marginBottom: 'var(--spacing-sm)', fontSize: '1.5rem', color: 'var(--primary-color)', fontWeight: 'var(--font-weight-semibold)' }}>
              {association?.name || 'Unknown Association'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              <span style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-muted)' }}>Season {seasonYear}</span>
              <div style={statusBadgeStyle(offer.status)}>{offer.status}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            {offer.status === 'draft' && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ background: 'var(--warning-color)', color: '#000' }}
                onClick={() => navigate(`/offers/${id}/edit`)}
              >
                ✎ Full Edit
              </button>
            )}
            <button
              className="btn btn-outline btn-sm"
              onClick={() => navigate('/offers')}
            >
              ← Back to List
            </button>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="responsive-flex" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div className="summary-card" style={{ flex: 1 }}>
          <div className="summary-card-icon" style={{ color: 'var(--secondary-color)', background: 'var(--secondary-color)15' }}>C</div>
          <div>
            <span className="summary-card-label">Created</span>
            <strong className="summary-card-value" style={{ fontSize: 'var(--font-size-md)' }}>{formatDate(offer.createdAt)}</strong>
          </div>
        </div>
        
        <div className="summary-card" style={{ flex: 1 }}>
          <div className="summary-card-icon" style={{ color: '#0369a1', background: '#0369a115' }}>S</div>
          <div>
            <span className="summary-card-label">Sent</span>
            <strong className="summary-card-value" style={{ fontSize: 'var(--font-size-md)' }}>{offer.sentAt ? formatDate(offer.sentAt) : 'Not sent'}</strong>
          </div>
        </div>
        
        <div className="summary-card" style={{ flex: 2 }}>
          <div className="summary-card-icon" style={{ color: 'var(--success-color)', background: 'var(--success-color)15' }}>€</div>
          <div style={{ flex: 1 }}>
            <span className="summary-card-label">Total Revenue</span>
            <strong className="summary-card-value" style={{ color: 'var(--success-color)' }}>{formatPrice(totalPrice)}</strong>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="summary-card-label">Leagues</span>
            <strong className="summary-card-value">{offer.leagueIds.length}</strong>
          </div>
        </div>
      </div>

      {/* Configs Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--spacing-xl)' }}>
        <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>League Pricing Breakdown</h3>
        </div>
        <table className="mobile-cards-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>League</th>
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'right', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>Base Price</th>
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'right', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>Custom Price</th>
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'right', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>Final Price</th>
              {offer.status === 'draft' && <th style={{ padding: 'var(--spacing-lg)', textAlign: 'center', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {configs.map((config) => (
              <tr key={config._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td data-label="League" style={{ padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-md)' }}>{config.leagueName}</td>
                <td data-label="Base Price" style={{ padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-md)', textAlign: 'right' }}>{formatPrice(config.basePrice)}</td>
                <td data-label="Custom Price" style={{ padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-md)', textAlign: 'right' }}>
                  {editingLeagueId === config.leagueId && offer.status === 'draft' ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingPrice ?? config.customPrice ?? config.basePrice}
                      onChange={(e) => setEditingPrice(Number(e.target.value))}
                      className="form-control"
                      style={{ width: '100px', display: 'inline-block', padding: '6px' }}
                      autoFocus
                    />
                  ) : config.customPrice ? (
                    formatPrice(config.customPrice)
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>-</span>
                  )}
                </td>
                <td data-label="Final Price" style={{ padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-md)', textAlign: 'right', fontWeight: 'var(--font-weight-semibold)', color: 'var(--primary-color)' }}>
                  {formatPrice(config.finalPrice)}
                </td>
                {offer.status === 'draft' && (
                  <td data-label="Actions" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', justifyContent: 'center' }}>
                      {editingLeagueId === config.leagueId ? (
                        <>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ background: 'var(--success-color)' }}
                            onClick={() => updateConfig.mutate({ configId: config._id, customPrice: editingPrice })}
                            disabled={editingPrice === null || editingPrice < 0 || updateConfig.isPending}
                          >
                            {updateConfig.isPending ? '…' : 'Save'}
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => { setEditingLeagueId(null); setEditingPrice(null); }}
                            disabled={updateConfig.isPending}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => { setEditingLeagueId(config.leagueId); setEditingPrice(config.customPrice || config.basePrice); }}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions Section */}
      <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end', marginTop: 'var(--spacing-xl)' }}>
        {(offer.status === 'draft' || offer.status === 'sending') && (
          <button
            className="btn btn-primary"
            style={{ background: 'var(--success-color)', paddingLeft: '2rem', paddingRight: '2rem' }}
            onClick={() => setShowSendDialog(true)}
            disabled={offer.status === 'sending'}
          >
            {offer.status === 'sending' ? '🚀 Sending…' : '🚀 Send Offer'}
          </button>
        )}
        {offer.status === 'sent' && (
           <button
            className="btn btn-primary"
            style={{ background: 'var(--success-color)', paddingLeft: '2rem', paddingRight: '2rem' }}
            onClick={() => markAccepted.mutate({ id: id! })}
            disabled={markAccepted.isPending}
          >
            {markAccepted.isPending ? '…' : '✓ Mark as Accepted'}
          </button>
        )}
        {offer.status === 'sent' && offer.emailMetadata?.driveFileId && (
          <a
            href={`https://drive.google.com/file/d/${offer.emailMetadata.driveFileId}/view`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            View PDF in Drive
          </a>
        )}
      </div>

      {showSendDialog && (
        <SendOfferDialog
          open={showSendDialog}
          offerId={id}
          recipientEmail={data?.contact?.email || ''}
          recipientName={data?.contact?.name || 'Unknown Contact'}
          totalPrice={data?.offer?.pricing?.expectedPrice || 0}
          onClose={() => setShowSendDialog(false)}
          onSuccess={() => {
            setShowSendDialog(false);
            refetch();
          }}
          onError={(message) => console.error(message)}
        />
      )}
    </div>
  );
}
