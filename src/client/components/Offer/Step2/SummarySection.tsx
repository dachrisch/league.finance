import styles from '../../../styles/OfferWizard.module.css';

interface SummarySectionProps {
  associationName: string;
  contactName: string;
  seasonYear?: string;
  onEdit: () => void;
}

export function SummarySection({
  associationName,
  contactName,
  seasonYear,
  onEdit,
}: SummarySectionProps) {
  return (
    <div className={styles.summary}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 className={styles.summaryTitle} style={{ margin: 0 }}>Review Details</h3>
        <button className={styles.summaryEdit} onClick={onEdit} style={{ background: 'none', border: 'none', padding: 0 }}>
          Edit Step 1
        </button>
      </div>

      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>Association</span>
        <span className={styles.summaryValue}>{associationName}</span>
      </div>

      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>Contact</span>
        <span className={styles.summaryValue}>{contactName}</span>
      </div>

      <div className={styles.summaryRow}>
        <span className={styles.summaryLabel}>Season</span>
        <span className={styles.summaryValue}>{seasonYear || 'Not selected'}</span>
      </div>
    </div>
  );
}
