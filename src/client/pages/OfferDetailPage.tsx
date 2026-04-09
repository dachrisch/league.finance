import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';

const statusBadgeStyle = (status: string): React.CSSProperties => {
  const colors: Record<string, { bg: string; color: string }> = {
    draft: { bg: '#e9ecef', color: '#495057' },
    sent: { bg: '#cfe2ff', color: '#084298' },
    accepted: { bg: '#d1e7dd', color: '#0f5132' },
  };

  const colorSet = colors[status] || colors.draft;

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
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
};

const formatPrice = (price: number): string => `$${price.toFixed(2)}`;

export function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editingPrice, setEditingPrice] = useState<number | null>(null);
  const [editingLeagueId, setEditingLeagueId] = useState<number | null>(null);

  if (!id) {
    return <div>Offer not found.</div>;
  }

  const { data, isLoading, refetch } = trpc.finance.offers.get.useQuery({ id });
  const { data: association } = trpc.finance.associations.get.useQuery(
    data?.associationId ? { id: data.associationId } : { id: '' },
    { enabled: !!data?.associationId }
  );

  const markSent = trpc.finance.offers.markSent.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const markAccepted = trpc.finance.offers.markAccepted.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  if (isLoading) {
    return <div className="container"><p>Loading offer...</p></div>;
  }

  if (!data) {
    return (
      <div className="container">
        <p>Offer not found.</p>
        <button onClick={() => navigate('/offers')} style={{
          padding: '0.5rem 1rem',
          background: '#0d6efd',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
        }}>
          Back to Offers
        </button>
      </div>
    );
  }

  const offer = data;
  const configs = offer.configs || [];
  const totalPrice = configs.reduce((sum, config) => sum + config.finalPrice, 0);

  return (
    <div className="container" style={{ paddingBottom: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, marginBottom: '0.5rem' }}>
              {association?.name || 'Unknown Association'} - Season {offer.seasonId}
            </h1>
            <div style={statusBadgeStyle(offer.status)}>{offer.status}</div>
          </div>
          <button
            onClick={() => navigate('/offers')}
            style={{
              padding: '0.5rem 1rem',
              background: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Back
          </button>
        </div>
      </div>

      {/* Summary Section */}
      <div style={{
        background: '#f8f9fa',
        padding: '1.5rem',
        borderRadius: 8,
        marginBottom: '2rem',
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <p style={{ margin: 0, color: '#666', fontSize: 12 }}>CREATED</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: 14, fontWeight: 500 }}>{formatDate(offer.createdAt)}</p>
          </div>
          <div>
            <p style={{ margin: 0, color: '#666', fontSize: 12 }}>SENT</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: 14, fontWeight: 500 }}>{formatDate(offer.sentAt)}</p>
          </div>
          <div>
            <p style={{ margin: 0, color: '#666', fontSize: 12 }}>TOTAL REVENUE</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: 14, fontWeight: 500, color: '#198754' }}>
              {formatPrice(totalPrice)}
            </p>
          </div>
          <div>
            <p style={{ margin: 0, color: '#666', fontSize: 12 }}>LEAGUES</p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: 14, fontWeight: 500 }}>{offer.selectedLeagueIds.length}</p>
          </div>
        </div>
      </div>

      {/* Configs Table */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>League Pricing</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: '#fff',
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #dee2e6', background: '#f8f9fa' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontSize: 14, fontWeight: 600 }}>League</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontSize: 14, fontWeight: 600 }}>Base Price</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontSize: 14, fontWeight: 600 }}>Custom Price</th>
                <th style={{ padding: '1rem', textAlign: 'right', fontSize: 14, fontWeight: 600 }}>Final Price</th>
                {offer.status === 'draft' && <th style={{ padding: '1rem', textAlign: 'center', fontSize: 14, fontWeight: 600 }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => (
                <tr key={config._id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '1rem', fontSize: 14 }}>{config.leagueName}</td>
                  <td style={{ padding: '1rem', fontSize: 14, textAlign: 'right' }}>{formatPrice(config.basePrice)}</td>
                  <td style={{ padding: '1rem', fontSize: 14, textAlign: 'right' }}>
                    {editingLeagueId === config.leagueId && offer.status === 'draft' ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingPrice || config.customPrice || config.basePrice}
                        onChange={(e) => setEditingPrice(Number(e.target.value))}
                        style={{
                          width: '100px',
                          padding: '0.4rem',
                          border: '1px solid #0d6efd',
                          borderRadius: 4,
                        }}
                      />
                    ) : config.customPrice ? (
                      formatPrice(config.customPrice)
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ padding: '1rem', fontSize: 14, textAlign: 'right', fontWeight: 500 }}>
                    {formatPrice(config.finalPrice)}
                  </td>
                  {offer.status === 'draft' && (
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {editingLeagueId === config.leagueId ? (
                        <>
                          <button
                            onClick={() => {
                              if (editingPrice !== null) {
                                // Placeholder for customize price mutation
                                setEditingLeagueId(null);
                                setEditingPrice(null);
                              }
                            }}
                            style={{
                              padding: '0.3rem 0.6rem',
                              background: '#198754',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                              marginRight: '0.25rem',
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingLeagueId(null);
                              setEditingPrice(null);
                            }}
                            style={{
                              padding: '0.3rem 0.6rem',
                              background: '#6c757d',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: 12,
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingLeagueId(config.leagueId);
                            setEditingPrice(config.customPrice || config.basePrice);
                          }}
                          style={{
                            padding: '0.3rem 0.6rem',
                            background: '#0d6efd',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
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
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {offer.status === 'draft' && (
          <>
            <button
              onClick={() => {
                markSent.mutate({ id: id! });
              }}
              disabled={markSent.isPending}
              style={{
                padding: '0.5rem 1rem',
                background: '#198754',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: markSent.isPending ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {markSent.isPending ? 'Sending…' : 'Send Offer'}
            </button>
          </>
        )}
        {offer.status === 'sent' && offer.driveFileId && (
          <a
            href={`https://drive.google.com/file/d/${offer.driveFileId}/view`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '0.5rem 1rem',
              background: '#0d6efd',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              display: 'inline-block',
            }}
          >
            View PDF in Drive
          </a>
        )}
      </div>
    </div>
  );
}
