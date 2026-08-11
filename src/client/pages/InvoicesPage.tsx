import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';

const formatPrice = (price: number): string => `${price.toFixed(2)} €`;

export function InvoicesPage() {
  const navigate = useNavigate();
  const { data: invoices = [], isLoading } = trpc.finance.invoices.list.useQuery({});
  const { data: associations = [] } = trpc.finance.associations.list.useQuery();

  const associationNames: Record<string, string> = associations.reduce((acc: Record<string, string>, a: any) => {
    acc[a._id] = a.name;
    return acc;
  }, {});

  if (isLoading) return <div className="container"><p>Loading invoices…</p></div>;

  const summary = {
    draft: invoices.filter((i: any) => i.status === 'draft').length,
    sent: invoices.filter((i: any) => i.status === 'sent').length,
    paid: invoices.filter((i: any) => i.status === 'paid').length,
    totalGross: invoices.reduce((sum: number, i: any) => sum + (i.grossTotal || 0), 0),
  };

  return (
    <div className="container" style={{ paddingBottom: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary-color)' }}>Invoices</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
            Track invoices issued from accepted offers
          </p>
        </div>
      </div>

      <div className="responsive-flex" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div className="summary-card" style={{ flex: 1 }}>
          <span className="summary-card-label">Draft</span>
          <strong className="summary-card-value">{summary.draft}</strong>
        </div>
        <div className="summary-card" style={{ flex: 1 }}>
          <span className="summary-card-label">Sent</span>
          <strong className="summary-card-value">{summary.sent}</strong>
        </div>
        <div className="summary-card" style={{ flex: 1 }}>
          <span className="summary-card-label">Paid</span>
          <strong className="summary-card-value">{summary.paid}</strong>
        </div>
        <div className="summary-card" style={{ flex: 2 }}>
          <span className="summary-card-label">Total Gross</span>
          <strong className="summary-card-value" style={{ color: 'var(--success-color)' }}>{formatPrice(summary.totalGross)}</strong>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="mobile-cards-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left' }}>Invoice #</th>
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left' }}>Association</th>
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left' }}>Date</th>
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left' }}>Status</th>
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'right' }}>Gross</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice: any) => (
              <tr
                key={invoice._id}
                style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                onClick={() => navigate(`/invoices/${invoice._id}`)}
              >
                <td style={{ padding: 'var(--spacing-lg)' }}>{invoice.invoiceNumber}</td>
                <td style={{ padding: 'var(--spacing-lg)' }}>{associationNames[invoice.associationId] || 'Unknown'}</td>
                <td style={{ padding: 'var(--spacing-lg)' }}>{new Date(invoice.invoiceDate).toLocaleDateString('de-DE')}</td>
                <td style={{ padding: 'var(--spacing-lg)', textTransform: 'capitalize' }}>{invoice.status}</td>
                <td style={{ padding: 'var(--spacing-lg)', textAlign: 'right', fontWeight: 'var(--font-weight-semibold)' }}>
                  {formatPrice(invoice.grossTotal)}
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
