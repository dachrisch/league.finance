import React from 'react';

interface Props {
  totalGross: number;
  totalDiscount: number;
  totalNet: number;
}

export function SummaryCards({ totalGross, totalDiscount, totalNet }: Props) {
  return (
    <div className="responsive-flex" style={{ marginBottom: '2rem' }}>
      <div className="summary-card" style={{ flex: 1 }}>
        <div className="summary-card-icon" style={{ color: 'var(--primary-color)', background: 'var(--primary-color)15' }}>G</div>
        <div>
          <span className="summary-card-label">Gross Revenue</span>
          <strong className="summary-card-value">{totalGross.toFixed(2)} €</strong>
        </div>
      </div>
      
      <div className="summary-card" style={{ flex: 1 }}>
        <div className="summary-card-icon" style={{ color: 'var(--danger-color)', background: 'var(--danger-color)15' }}>D</div>
        <div>
          <span className="summary-card-label">Total Discounts</span>
          <strong className="summary-card-value" style={{ color: 'var(--danger-color)' }}>-{totalDiscount.toFixed(2)} €</strong>
        </div>
      </div>
      
      <div className="summary-card" style={{ flex: 1 }}>
        <div className="summary-card-icon" style={{ color: 'var(--success-color)', background: 'var(--success-color)15' }}>N</div>
        <div>
          <span className="summary-card-label">Projected Net</span>
          <strong className="summary-card-value" style={{ color: 'var(--success-color)' }}>{totalNet.toFixed(2)} €</strong>
        </div>
      </div>
    </div>
  );
}
