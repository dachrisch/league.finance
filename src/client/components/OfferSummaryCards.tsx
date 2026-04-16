import React from 'react';

interface OfferSummaryCardsProps {
  totalOffers: number;
  draftOffers: number;
  sentOffers: number;
  pendingOffers: number; // VIEWED + NEGOTIATING
  acceptedOffers: number;
  totalRevenue: number;
}

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
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 'var(--spacing-lg)',
      marginBottom: 'var(--spacing-xl)',
    }}>
      <div className="summary-card">
        <div className="summary-card-icon" style={{ background: 'var(--primary-color)', color: 'white', border: 'none' }}>Σ</div>
        <div>
          <span className="summary-card-label">Total Offers</span>
          <strong className="summary-card-value">{totalOffers}</strong>
        </div>
      </div>
      
      <div className="summary-card">
        <div className="summary-card-icon" style={{ color: 'var(--secondary-color)', background: 'var(--secondary-color)15' }}>D</div>
        <div>
          <span className="summary-card-label">Draft</span>
          <strong className="summary-card-value">{draftOffers}</strong>
        </div>
      </div>
      
      <div className="summary-card">
        <div className="summary-card-icon" style={{ color: '#0369a1', background: '#0369a115' }}>S</div>
        <div>
          <span className="summary-card-label">Sent</span>
          <strong className="summary-card-value">{sentOffers}</strong>
        </div>
      </div>
      
      <div className="summary-card">
        <div className="summary-card-icon" style={{ color: 'var(--warning-color)', background: 'var(--warning-color)15' }}>P</div>
        <div>
          <span className="summary-card-label">Pending Response</span>
          <strong className="summary-card-value">{pendingOffers}</strong>
        </div>
      </div>
      
      <div className="summary-card">
        <div className="summary-card-icon" style={{ color: 'var(--success-color)', background: 'var(--success-color)15' }}>A</div>
        <div>
          <span className="summary-card-label">Accepted</span>
          <strong className="summary-card-value">{acceptedOffers}</strong>
        </div>
      </div>
      
      <div className="summary-card">
        <div className="summary-card-icon" style={{ color: 'var(--success-color)', background: 'var(--success-color)15' }}>€</div>
        <div>
          <span className="summary-card-label">Total Revenue</span>
          <strong className="summary-card-value">{totalRevenue.toFixed(2)} €</strong>
        </div>
      </div>
    </div>
  );
}
