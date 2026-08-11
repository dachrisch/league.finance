import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { FileInvoiceDialog } from '../components/Invoice/FileInvoiceDialog';

const statusBadgeStyle = (status: string): React.CSSProperties => {
  const colors: Record<string, { bg: string; color: string; border: string }> = {
    draft: { bg: 'var(--bg-secondary)', color: 'var(--text-muted)', border: 'var(--border-color)' },
    sent: { bg: '#eff6ff', color: '#0369a1', border: '#bae6fd' },
    paid: { bg: '#ecfdf5', color: 'var(--success-color)', border: 'var(--success-color)' },
  };
  const colorSet = colors[status] || colors.draft;
  return {
    display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px',
    background: colorSet.bg, color: colorSet.color, borderRadius: 'var(--border-radius-md)',
    fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)',
    border: `1px solid ${colorSet.border}`, textTransform: 'capitalize',
  };
};

const formatDate = (date: string | Date | undefined | null): string =>
  date ? new Date(date).toLocaleDateString('de-DE') : '-';

const formatPrice = (price: number): string => `${price.toFixed(2)} €`;

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showFileDialog, setShowFileDialog] = useState(false);

  if (!id) return <div className="container">Invoice not found.</div>;

  const { data, isLoading, refetch } = trpc.finance.invoices.get.useQuery({ id });

  const markPaid = trpc.finance.invoices.markPaid.useMutation({ onSuccess: () => refetch() });
  const deleteInvoice = trpc.finance.invoices.delete.useMutation({ onSuccess: () => navigate('/invoices') });

  if (isLoading) return <div className="container"><p>Loading invoice…</p></div>;
  if (!data) return <div className="container"><p>Invoice not found.</p></div>;

  const { invoice, association, contact, lineItems, totals } = data as any;

  return (
    <div className="container" style={{ paddingBottom: 'var(--spacing-xl)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--spacing-xl)' }}>
        <div>
          <h1 style={{ margin: '0 0 var(--spacing-xs) 0', fontSize: '1.5rem', color: 'var(--primary-color)' }}>
            {association?.name || 'Unknown Association'}
          </h1>
          {contact?.name && (
            <p style={{ margin: '0 0 var(--spacing-sm) 0', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
              z.H. {contact.name}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Rechnung {invoice.invoiceNumber}</span>
            <div style={statusBadgeStyle(invoice.status)}>{invoice.status}</div>
          </div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/invoices')}>← Back to Invoices</button>
      </div>

      <div className="responsive-flex" style={{ marginBottom: 'var(--spacing-xl)' }}>
        <div className="summary-card" style={{ flex: 1 }}>
          <span className="summary-card-label">Kundennummer</span>
          <strong className="summary-card-value">{invoice.customerNumber}</strong>
        </div>
        <div className="summary-card" style={{ flex: 1 }}>
          <span className="summary-card-label">Rechnungsdatum</span>
          <strong className="summary-card-value" style={{ fontSize: 'var(--font-size-md)' }}>{formatDate(invoice.invoiceDate)}</strong>
        </div>
        <div className="summary-card" style={{ flex: 1 }}>
          <span className="summary-card-label">Fällig</span>
          <strong className="summary-card-value" style={{ fontSize: 'var(--font-size-md)' }}>{formatDate(invoice.dueDate)}</strong>
        </div>
        <div className="summary-card" style={{ flex: 2 }}>
          <span className="summary-card-label">Gesamtbetrag</span>
          <strong className="summary-card-value" style={{ color: 'var(--success-color)' }}>{formatPrice(totals.grossTotal)}</strong>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 'var(--spacing-xl)' }}>
        <table className="mobile-cards-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left' }}>League</th>
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'left' }}>Source</th>
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'right' }}>Netto</th>
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'right' }}>MwSt.</th>
              <th style={{ padding: 'var(--spacing-lg)', textAlign: 'right' }}>Brutto</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((li: any) => (
              <tr key={li._id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: 'var(--spacing-lg)' }}>{li.leagueName}</td>
                <td style={{ padding: 'var(--spacing-lg)', textTransform: 'capitalize' }}>{li.chosenSource}</td>
                <td style={{ padding: 'var(--spacing-lg)', textAlign: 'right' }}>{formatPrice(li.amount)}</td>
                <td style={{ padding: 'var(--spacing-lg)', textAlign: 'right' }}>{formatPrice(li.vat)}</td>
                <td style={{ padding: 'var(--spacing-lg)', textAlign: 'right', fontWeight: 'var(--font-weight-semibold)' }}>{formatPrice(li.gross)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: 'var(--spacing-lg)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, borderTop: '1px solid var(--border-color)' }}>
          {invoice.discount && (
            <span>
              Rabatt ({invoice.discount.description || (invoice.discount.type === 'PERCENT' ? `${invoice.discount.value}%` : formatPrice(invoice.discount.value))}):
              {' '}-{formatPrice(totals.discountAmount)}
            </span>
          )}
          <span>Nettobetrag: {formatPrice(totals.netTotal)}</span>
          <span>MwSt. 19%: {formatPrice(totals.vatTotal)}</span>
          <strong>Gesamtbetrag: {formatPrice(totals.grossTotal)}</strong>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end' }}>
        {invoice.status === 'draft' && (
          <>
            <button className="btn btn-outline" onClick={() => deleteInvoice.mutate({ id })} disabled={deleteInvoice.isPending}>
              Delete
            </button>
            <button className="btn btn-primary" style={{ background: 'var(--success-color)' }} onClick={() => setShowFileDialog(true)}>
              🚀 File in Drive
            </button>
          </>
        )}
        {invoice.status === 'sent' && (
          <button className="btn btn-primary" style={{ background: 'var(--success-color)' }} onClick={() => markPaid.mutate({ id })} disabled={markPaid.isPending}>
            {markPaid.isPending ? '…' : '✓ Mark as Paid'}
          </button>
        )}
        {(invoice.status === 'sent' || invoice.status === 'paid') && invoice.driveMetadata?.driveFileId && (
          <a
            href={invoice.driveMetadata.driveLink || `https://drive.google.com/file/d/${invoice.driveMetadata.driveFileId}/view`}
            target="_blank" rel="noopener noreferrer" className="btn btn-primary"
          >
            Open in Drive
          </a>
        )}
      </div>

      {showFileDialog && (
        <FileInvoiceDialog
          open={showFileDialog}
          invoiceId={id}
          recipientName={association?.name || 'Unknown Association'}
          totalPrice={totals.grossTotal}
          onClose={() => setShowFileDialog(false)}
          onSuccess={() => { setShowFileDialog(false); refetch(); }}
          onError={(message) => console.error(message)}
        />
      )}
    </div>
  );
}
