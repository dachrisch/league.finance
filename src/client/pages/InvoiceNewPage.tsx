import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';

type ChosenSource = 'offer' | 'live' | 'custom';

const formatPrice = (price: number): string => `${price.toFixed(2)} €`;

export function InvoiceNewPage() {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();

  const { data: preview, isLoading, error } = trpc.finance.invoices.previewForOffer.useQuery(
    { offerId: offerId! },
    { enabled: !!offerId }
  );

  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [source, setSource] = useState<Record<number, ChosenSource>>({});
  const [customPrice, setCustomPrice] = useState<Record<number, string>>({});
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [discountValue, setDiscountValue] = useState('');
  const [discountDescription, setDiscountDescription] = useState('');

  useEffect(() => {
    if (!preview) return;
    setSelected((prev) => {
      const next = { ...prev };
      for (const line of preview.lines) if (!(line.leagueId in next)) next[line.leagueId] = true;
      return next;
    });
    setSource((prev) => {
      const next = { ...prev };
      for (const line of preview.lines) if (!(line.leagueId in next)) next[line.leagueId] = 'offer';
      return next;
    });
  }, [preview]);

  const createInvoice = trpc.finance.invoices.create.useMutation({
    onSuccess: (result) => navigate(`/invoices/${result.invoice._id}`),
  });

  if (!offerId) return <div className="container"><p>Missing offer.</p></div>;
  if (isLoading) return <div className="container"><p>Loading offer pricing…</p></div>;

  if (error || !preview) {
    return (
      <div className="container">
        <p style={{ color: 'var(--danger-color)' }}>{error?.message || 'Could not load this offer for invoicing.'}</p>
        <button className="btn btn-outline" onClick={() => navigate(`/offers/${offerId}`)}>Back to Offer</button>
      </div>
    );
  }

  const selectedLeagueIds = preview.lines.filter((l) => selected[l.leagueId]).map((l) => l.leagueId);

  const handleSubmit = () => {
    createInvoice.mutate({
      offerId,
      lines: selectedLeagueIds.map((leagueId) => ({
        leagueId,
        chosenSource: source[leagueId],
        customPrice: source[leagueId] === 'custom' ? Number(customPrice[leagueId]) : undefined,
      })),
      discount: discountEnabled && discountValue
        ? { type: discountType, value: Number(discountValue), description: discountDescription }
        : undefined,
    });
  };

  const canSubmit =
    preview.customerNumber != null &&
    selectedLeagueIds.length > 0 &&
    selectedLeagueIds.every((id) => source[id] !== 'custom' || (customPrice[id] && Number(customPrice[id]) > 0));

  return (
    <div className="container" style={{ paddingBottom: 'var(--spacing-xl)' }}>
      <button className="btn btn-outline btn-sm" style={{ marginBottom: 'var(--spacing-lg)' }} onClick={() => navigate(`/offers/${offerId}`)}>
        ← Back to Offer
      </button>

      <h1 style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: '1.5rem', color: 'var(--primary-color)' }}>
        New Invoice — {preview.associationName}
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-lg)' }}>Season {preview.seasonName}</p>

      {preview.customerNumber == null && (
        <div className="card" style={{ background: '#fff7ed', border: '1px solid #fed7aa', padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
          <p style={{ margin: 0 }}>
            This association has no customer number set. <a href="/associations">Set one</a> before creating an invoice.
          </p>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--spacing-xl)' }}>
        <table className="mobile-cards-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              <th style={{ padding: 'var(--spacing-md)', textAlign: 'left' }}>Include</th>
              <th style={{ padding: 'var(--spacing-md)', textAlign: 'left' }}>League</th>
              <th style={{ padding: 'var(--spacing-md)', textAlign: 'left' }}>Price to bill</th>
            </tr>
          </thead>
          <tbody>
            {preview.lines.map((line) => {
              const basisLabel = line.costModel === 'SEASON' ? 'teams' : 'gamedays played';
              return (
                <tr key={line.leagueId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: 'var(--spacing-md)' }}>
                    <input
                      type="checkbox"
                      checked={!!selected[line.leagueId]}
                      onChange={(e) => setSelected((prev) => ({ ...prev, [line.leagueId]: e.target.checked }))}
                    />
                  </td>
                  <td style={{ padding: 'var(--spacing-md)' }}>
                    {line.leagueName}
                    {line.alreadyInvoiced && (
                      <span style={{ marginLeft: 8, fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                        (already invoiced)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--spacing-md)' }}>
                    <label style={{ display: 'block' }}>
                      <input
                        type="radio"
                        name={`source-${line.leagueId}`}
                        checked={source[line.leagueId] === 'offer'}
                        disabled={!selected[line.leagueId]}
                        onChange={() => setSource((prev) => ({ ...prev, [line.leagueId]: 'offer' }))}
                      />{' '}
                      Offer price: {formatPrice(line.offerPrice)}
                    </label>
                    <label style={{ display: 'block' }}>
                      <input
                        type="radio"
                        name={`source-${line.leagueId}`}
                        checked={source[line.leagueId] === 'live'}
                        disabled={!selected[line.leagueId]}
                        onChange={() => setSource((prev) => ({ ...prev, [line.leagueId]: 'live' }))}
                      />{' '}
                      Live price: {formatPrice(line.livePrice)} ({line.liveBasis} {basisLabel})
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="radio"
                        name={`source-${line.leagueId}`}
                        checked={source[line.leagueId] === 'custom'}
                        disabled={!selected[line.leagueId]}
                        onChange={() => setSource((prev) => ({ ...prev, [line.leagueId]: 'custom' }))}
                      />
                      Custom:
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        style={{ width: 100 }}
                        disabled={!selected[line.leagueId] || source[line.leagueId] !== 'custom'}
                        value={customPrice[line.leagueId] ?? ''}
                        onChange={(e) => setCustomPrice((prev) => ({ ...prev, [line.leagueId]: e.target.value }))}
                      />
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--spacing-md)' }}>
          <input type="checkbox" checked={discountEnabled} onChange={(e) => setDiscountEnabled(e.target.checked)} />
          Apply a discount to this invoice
        </label>
        {discountEnabled && (
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
            <select value={discountType} onChange={(e) => setDiscountType(e.target.value as 'FIXED' | 'PERCENT')}>
              <option value="FIXED">Fixed (€)</option>
              <option value="PERCENT">Percentage (%)</option>
            </select>
            <input type="number" min="0" step="0.01" placeholder="Value" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} style={{ width: 100 }} />
            <input type="text" placeholder="Description" value={discountDescription} onChange={(e) => setDiscountDescription(e.target.value)} style={{ flex: 1 }} />
          </div>
        )}
      </div>

      {createInvoice.error && (
        <p style={{ color: 'var(--danger-color)', marginBottom: 'var(--spacing-md)' }}>{createInvoice.error.message}</p>
      )}

      <button className="btn btn-primary" disabled={!canSubmit || createInvoice.isPending} onClick={handleSubmit}>
        {createInvoice.isPending ? 'Creating…' : 'Create Draft Invoice'}
      </button>
    </div>
  );
}
