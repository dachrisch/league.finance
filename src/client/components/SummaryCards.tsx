interface Props {
  totalGross: number;
  totalDiscount: number;
  totalNet: number;
}

const cardStyle = (color: string): React.CSSProperties => ({
  flex: 1,
  padding: '1.5rem',
  borderRadius: 8,
  borderLeft: `6px solid ${color}`,
  background: '#fff',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
});

export function SummaryCards({ totalGross, totalDiscount, totalNet }: Props) {
  return (
    <div className="responsive-flex" style={{ marginBottom: '2rem' }}>
      <div style={cardStyle('#0d6efd')}>
        <p style={{ margin: 0, color: '#666', fontSize: 12, textTransform: 'uppercase' }}>Gross Revenue</p>
        <h2 style={{ margin: 0, color: '#0d6efd' }}>{totalGross.toFixed(2)} €</h2>
      </div>
      <div style={cardStyle('#dc3545')}>
        <p style={{ margin: 0, color: '#666', fontSize: 12, textTransform: 'uppercase' }}>Total Discounts</p>
        <h2 style={{ margin: 0, color: '#dc3545' }}>-{totalDiscount.toFixed(2)} €</h2>
      </div>
      <div style={cardStyle('#198754')}>
        <p style={{ margin: 0, color: '#666', fontSize: 12, textTransform: 'uppercase' }}>Projected Net</p>
        <h2 style={{ margin: 0, color: '#198754' }}>{totalNet.toFixed(2)} €</h2>
      </div>
    </div>
  );
}
