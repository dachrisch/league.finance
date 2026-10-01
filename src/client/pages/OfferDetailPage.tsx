import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { FileOfferDialog } from '../components/Offer/FileOfferDialog';
import { OfferLinesEditor } from '../components/Offer/OfferLinesEditor';

const toDateInputValue = (value: string | Date | undefined | null): string =>
  value ? new Date(value).toISOString().slice(0, 10) : '';

const statusBadgeStyle = (status: string): React.CSSProperties => {
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    draft: { bg: 'var(--bg-secondary)', color: 'var(--text-muted)', border: 'var(--border-color)' },
    sending: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
    sent: { bg: '#eff6ff', color: '#0369a1', border: '#bae6fd' },
    accepted: { bg: '#ecfdf5', color: 'var(--success-color)', border: 'var(--success-color)' },
    rejected: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
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
  const [letterFields, setLetterFields] = useState({
    offerNumber: '',
    offerDate: '',
    validUntil: '',
    introNote: '',
    closingNote: '',
  });

  if (!id) {
    return <div className="container">Offer not found.</div>;
  }

  const { data, isLoading, refetch } = trpc.finance.offers.get.useQuery({ id });
  const { data: association } = trpc.finance.associations.get.useQuery(
    data?.offer?.associationId ? { id: data.offer.associationId.toString() } : { id: '' },
    { enabled: !!data?.offer?.associationId }
  );
  const { data: seasons = [] } = trpc.finance.seasons.list.useQuery();
  const { data: invoices = [] } = trpc.finance.invoices.list.useQuery({});

  const markAccepted = trpc.finance.offers.markAccepted.useMutation({
    onSuccess: () => refetch(),
  });
  const markRejected = trpc.finance.offers.markRejected.useMutation({
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

  const setLines = trpc.finance.offers.setLines.useMutation({ onSuccess: () => refetch(), onError: (e) => alert(e.message) });
  const generateLines = trpc.finance.offers.generateLines.useMutation({ onSuccess: () => refetch(), onError: (e) => alert(e.message) });
  const updateLetter = trpc.finance.offers.updateLetter.useMutation({ onSuccess: () => refetch(), onError: (e) => alert(e.message) });
  const utils = trpc.useUtils();
  const openPreview = async () => {
    const { base64 } = await utils.finance.offers.previewPdf.fetch({ id });
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    window.open(URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })), '_blank');
  };

  useEffect(() => {
    if (!data?.offer) return;
    setLetterFields({
      offerNumber: data.offer.offerNumber ?? '',
      offerDate: toDateInputValue(data.offer.offerDate),
      validUntil: toDateInputValue(data.offer.validUntil),
      introNote: data.offer.introNote ?? '',
      closingNote: data.offer.closingNote ?? '',
    });
  }, [data?.offer]);

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
  const totalPrice = data.totalPrice;
  const season = seasons.find(s => s._id === offer.seasonId);
  const seasonYear = season?.name || offer.seasonId;
  const offerInvoices = invoices.filter((inv: any) => inv.offerId === id);

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
                ✎ Edit
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

      {/* Price Lines + Actions */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--spacing-xl)' }}>
        <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>Preise</h3>
        </div>
        <div style={{ padding: 'var(--spacing-lg)' }}>
          <OfferLinesEditor
            lines={offer.lines ?? []}
            readOnly={offer.status !== 'draft'}
            saving={setLines.isPending}
            onSave={(lines) => setLines.mutate({ id, lines })}
            onGenerate={() => generateLines.mutate({ id, overwrite: !!offer.lines?.length && confirm('Vorhandene Zeilen ersetzen?') })}
          />
        </div>
        <details style={{ borderTop: '1px solid var(--border-color)' }}>
          <summary style={{ cursor: 'pointer', padding: 'var(--spacing-md) var(--spacing-lg)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-muted)' }}>
            Liga-Konfiguration
          </summary>
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
        </details>

        {/* Action buttons directly below league table */}
        <div style={{ padding: 'var(--spacing-lg)', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end' }}>
          {(offer.status === 'draft' || offer.status === 'sending') && (
            <button
              className="btn btn-primary"
              style={{ background: 'var(--success-color)', paddingLeft: '2rem', paddingRight: '2rem' }}
              onClick={() => setShowSendDialog(true)}
              disabled={offer.status === 'sending'}
            >
              {offer.status === 'sending' ? '🚀 Filing…' : '🚀 File in Drive'}
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
          {offer.status === 'sent' && (
            <button
              className="btn btn-ghost"
              style={{ color: 'var(--danger-color)' }}
              onClick={() => markRejected.mutate({ id: id! })}
              disabled={markRejected.isPending}
            >
              {markRejected.isPending ? '…' : '✕ Mark as Rejected'}
            </button>
          )}
          {(offer.status === 'sent' || offer.status === 'accepted') && offer.driveMetadata?.driveFileId && (
            <a
              href={offer.driveMetadata.driveLink || `https://drive.google.com/file/d/${offer.driveMetadata.driveFileId}/view`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
            >
              View Invoice
            </a>
          )}
        </div>
      </div>

      {/* Angebotsschreiben (letter fields, drafts only) */}
      {offer.status === 'draft' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--spacing-xl)' }}>
          <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>Angebotsschreiben</h3>
          </div>
          <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div className="responsive-flex" style={{ gap: 'var(--spacing-md)' }}>
              <label style={{ flex: 1 }}>
                <span style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Angebotsnummer</span>
                <input
                  type="text"
                  className="form-control"
                  style={{ width: '100%' }}
                  value={letterFields.offerNumber}
                  onChange={(e) => setLetterFields((f) => ({ ...f, offerNumber: e.target.value }))}
                />
              </label>
              <label style={{ flex: 1 }}>
                <span style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Datum</span>
                <input
                  type="date"
                  className="form-control"
                  style={{ width: '100%' }}
                  value={letterFields.offerDate}
                  onChange={(e) => setLetterFields((f) => ({ ...f, offerDate: e.target.value }))}
                />
              </label>
              <label style={{ flex: 1 }}>
                <span style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Gültig bis</span>
                <input
                  type="date"
                  className="form-control"
                  style={{ width: '100%' }}
                  value={letterFields.validUntil}
                  onChange={(e) => setLetterFields((f) => ({ ...f, validUntil: e.target.value }))}
                />
              </label>
            </div>
            <label>
              <span style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Zusatztext</span>
              <textarea
                className="form-control"
                style={{ width: '100%', minHeight: '80px' }}
                value={letterFields.introNote}
                onChange={(e) => setLetterFields((f) => ({ ...f, introNote: e.target.value }))}
              />
            </label>
            <label>
              <span style={{ display: 'block', marginBottom: '4px', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>Schlusstext</span>
              <textarea
                className="form-control"
                style={{ width: '100%', minHeight: '80px' }}
                value={letterFields.closingNote}
                onChange={(e) => setLetterFields((f) => ({ ...f, closingNote: e.target.value }))}
              />
            </label>
          </div>
          <div style={{ padding: 'var(--spacing-lg)', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => updateLetter.mutate({ id, data: { assignNumber: true } })}
              disabled={updateLetter.isPending || !!offer.offerNumber}
            >
              Nummer vergeben
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={openPreview}
            >
              PDF-Vorschau
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => updateLetter.mutate({
                id,
                data: {
                  offerNumber: letterFields.offerNumber.trim() || undefined,
                  offerDate: letterFields.offerDate || undefined,
                  validUntil: letterFields.validUntil || undefined,
                  introNote: letterFields.introNote || undefined,
                  closingNote: letterFields.closingNote || undefined,
                },
              })}
              disabled={updateLetter.isPending}
            >
              {updateLetter.isPending ? '…' : 'Speichern'}
            </button>
          </div>
        </div>
      )}

      {/* Invoices Section */}
      {offer.status === 'accepted' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--spacing-xl)' }}>
          <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>Invoices</h3>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/offers/${id}/invoices/new`)}>
              + Create Invoice
            </button>
          </div>
          {offerInvoices.length > 0 ? (
            <table className="mobile-cards-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left', fontSize: 'var(--font-size-sm)' }}>Invoice #</th>
                  <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left', fontSize: 'var(--font-size-sm)' }}>Status</th>
                  <th style={{ padding: 'var(--spacing-lg)', textAlign: 'right', fontSize: 'var(--font-size-sm)' }}>Gross</th>
                  <th style={{ padding: 'var(--spacing-lg)', textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {offerInvoices.map((inv: any) => (
                  <tr key={inv._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: 'var(--spacing-lg)', fontSize: 'var(--font-size-md)' }}>{inv.invoiceNumber}</td>
                    <td style={{ padding: 'var(--spacing-lg)', textTransform: 'capitalize', fontSize: 'var(--font-size-sm)' }}>{inv.status}</td>
                    <td style={{ padding: 'var(--spacing-lg)', textAlign: 'right', fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-md)' }}>{formatPrice(inv.grossTotal)}</td>
                    <td style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate(`/invoices/${inv._id}`)}
                      >
                        View Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ padding: 'var(--spacing-lg)', color: 'var(--text-muted)', margin: 0 }}>No invoices yet for this offer.</p>
          )}
        </div>
      )}

      {/* Actions moved inside Leagues card (after league table) */}

      {showSendDialog && (
        <FileOfferDialog
          open={showSendDialog}
          offerId={id}
          recipientName={data?.contact?.name || 'Unknown Contact'}
          totalPrice={totalPrice}
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
