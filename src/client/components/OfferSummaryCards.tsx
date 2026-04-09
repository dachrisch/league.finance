interface OfferSummaryCardsProps {
  totalOffers: number;
  draftOffers: number;
  sentOffers: number;
  pendingOffers: number; // VIEWED + NEGOTIATING
  acceptedOffers: number;
  totalRevenue: number;
}

const cardStyle = (color: string): React.CSSProperties => ({
  flex: 1,
  minWidth: '150px',
  padding: '1.5rem',
  borderRadius: 8,
  borderLeft: `6px solid ${color}`,
  background: '#fff',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
});

const valueStyle = (color: string): React.CSSProperties => ({
  margin: 0,
  color,
  fontSize: 24,
  fontWeight: 600,
  marginTop: '0.5rem',
});

const labelStyle: React.CSSProperties = {
  margin: 0,
  color: '#666',
  fontSize: 12,
  textTransform: 'uppercase',
  fontWeight: 500,
};

export function OfferSummaryCards({
  totalOffers,
  draftOffers,
  sentOffers,
  pendingOffers,
  acceptedOffers,
  totalRevenue,
}: OfferSummaryCardsProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '1rem',
      marginBottom: '2rem',
    }}>
      <div style={cardStyle('#0d6efd')}>
        <p style={labelStyle}>Total Offers</p>
        <p style={valueStyle('#0d6efd')}>{totalOffers}</p>
      </div>
      <div style={cardStyle('#6c757d')}>
        <p style={labelStyle}>Draft</p>
        <p style={valueStyle('#6c757d')}>{draftOffers}</p>
      </div>
      <div style={cardStyle('#0dcaf0')}>
        <p style={labelStyle}>Sent</p>
        <p style={valueStyle('#0dcaf0')}>{sentOffers}</p>
      </div>
      <div style={cardStyle('#ffc107')}>
        <p style={labelStyle}>Pending Response</p>
        <p style={valueStyle('#ffc107')}>{pendingOffers}</p>
      </div>
      <div style={cardStyle('#198754')}>
        <p style={labelStyle}>Accepted</p>
        <p style={valueStyle('#198754')}>{acceptedOffers}</p>
      </div>
      <div style={cardStyle('#28a745')}>
        <p style={labelStyle}>Total Revenue</p>
        <p style={valueStyle('#28a745')}>${totalRevenue.toFixed(2)}</p>
      </div>
    </div>
  );
}
