import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';

const statusBadgeStyle = (status: string): React.CSSProperties => {
  const colors: Record<string, { bg: string; color: string }> = {
    draft: { bg: 'var(--bg-secondary)', color: 'var(--text-muted)' },
    sent: { bg: '#eff6ff', color: '#0369a1' },
    accepted: { bg: '#ecfdf5', color: 'var(--success-color)' },
  };

  const colorSet = colors[status] || colors.draft;

  return {
    display: 'inline-block',
    padding: '4px 8px',
    background: colorSet.bg,
    color: colorSet.color,
    borderRadius: 'var(--border-radius-sm)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    border: '1px solid currentColor',
  };
};

const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatPrice = (price: number): string => `$${price.toFixed(2)}`;

export function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editingPrice, setEditingPrice] = useState<number | null>(null);
  const [editingLeagueId, setEditingLeagueId] = useState<number | null>(null);

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
            <h1 style={{ margin: 0, marginBottom: 'var(--spacing-sm)', fontSize: '1.5rem', color: 'var(--primary-color)' }}>
              {association?.name || 'Unknown Association'} - Season {seasonYear}
            </h1>
            <div style={statusBadgeStyle(offer.status)}>{offer.status}</div>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => navigate('/offers')}
          >
            ← Back
          </button>
        </div>
      </div>

      {/* Summary Section */}
      <div className="card" style={{
        background: 'var(--bg-secondary)',
        marginBottom: 'var(--spacing-xl)',
      }}>
        <h3 style={{ margin: '0 0 var(--spacing-lg) 0', fontSize: 'var(--font-size-lg)' }}>Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-lg)' }}>
          <div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created</p>
            <p style={{ margin: 'var(--spacing-xs) 0 0 0', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-medium)' }}>{formatDate(offer.createdAt)}</p>
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sent</p>
            <p style={{ margin: 'var(--spacing-xs) 0 0 0', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-medium)' }}>{formatDate(offer.sentAt)}</p>
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Revenue</p>
            <p style={{ margin: 'var(--spacing-xs) 0 0 0', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--success-color)' }}>
              {formatPrice(totalPrice)}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 'var(--font-size-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leagues</p>
            <p style={{ margin: 'var(--spacing-xs) 0 0 0', fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-medium)' }}>{offer.leagueIds.length}</p>
          </div>
        </div>
      </div>

      {/* Configs Table */}
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h3 style={{ marginBottom: 'var(--spacing-lg)', fontSize: 'var(--font-size-lg)' }}>League Pricing</h3>
        <div>
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
                      <div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editingPrice ?? config.customPrice ?? config.basePrice}
                          onChange={(e) => setEditingPrice(Number(e.target.value))}
                          className="form-control"
                          style={{ width: '100px', display: 'inline-block', padding: '8px' }}
                        />
                      </div>
                    ) : config.customPrice ? (
                      formatPrice(config.customPrice)
                    ) : (
                      '-'
                    )}
                  </td>
                  <td data-label="Final Price" style={{ padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-md)', textAlign: 'right', fontWeight: 'var(--font-weight-medium)' }}>
                    {formatPrice(config.finalPrice)}
                  </td>
                  {offer.status === 'draft' && (
                    <td data-label="Actions" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
                      {editingLeagueId === config.leagueId ? (
                        <>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 12px', fontSize: 'var(--font-size-xs)', minHeight: '32px', marginRight: 'var(--spacing-xs)', background: 'var(--success-color)' }}
                            onClick={() => updateConfig.mutate({ configId: config._id, customPrice: editingPrice })}
                            disabled={editingPrice === null || editingPrice <= 0 || updateConfig.isPending}
                          >
                            {updateConfig.isPending ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            className="btn btn-outline"
                            style={{ padding: '4px 12px', fontSize: 'var(--font-size-xs)', minHeight: '32px' }}
                            onClick={() => { setEditingLeagueId(null); setEditingPrice(null); }}
                            disabled={updateConfig.isPending}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn-outline"
                          style={{ padding: '4px 12px', fontSize: 'var(--font-size-xs)', minHeight: '32px' }}
                          onClick={() => { setEditingLeagueId(config.leagueId); setEditingPrice(config.customPrice || config.basePrice); }}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions Section */}
      <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
        {offer.status === 'draft' && (
          <button
            className="btn btn-primary"
            style={{ background: 'var(--success-color)' }}
            onClick={() => markSent.mutate({ id: id! })}
            disabled={markSent.isPending}
          >
            {markSent.isPending ? 'Sending…' : 'Send Offer'}
          </button>
        )}
        {offer.status === 'sent' && offer.driveFileId && (
          <a
            href={`https://drive.google.com/file/d/${offer.driveFileId}/view`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            View PDF in Drive
          </a>
        )}
      </div>
    </div>
  );
}
