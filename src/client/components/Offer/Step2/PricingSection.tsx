// src/client/components/Offer/Step2/PricingSection.tsx

import type { PricingConfig } from '../types';
import styles from '../../../styles/OfferWizard.module.css';

interface PricingSectionProps {
  costModel: 'flatFee' | 'perGameDay';
  baseRateOverride?: number;
  expectedTeamsCount: number;
  onPricingChange: (pricing: Partial<PricingConfig>) => void;
}

export function PricingSection({
  costModel,
  baseRateOverride,
  expectedTeamsCount,
  onPricingChange,
}: PricingSectionProps) {
  return (
    <div className={styles.block}>
      <div className={styles.blockHeader}>
        <div className={`${styles.blockIcon} ${styles.active}`}>
          $
        </div>
        <div className={styles.blockText}>
          <strong className={styles.blockTitle}>Pricing Configuration</strong>
          <span className={styles.blockSubtitle}>
            Define cost model and expected volume
          </span>
        </div>
        <span className={styles.blockChevron}>▼</span>
      </div>

      <div className={`${styles.blockBody} ${styles.open}`}>
        <div className={styles.blockInner}>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="cost-model">
                Cost Model *
              </label>
              <select
                id="cost-model"
                className={styles.fieldSelect}
                value={costModel}
                onChange={(e) => onPricingChange({ costModel: e.target.value as any })}
              >
                <option value="flatFee">Flat Fee per Team</option>
                <option value="perGameDay">Per Game Day</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel} htmlFor="teams-count">
                Expected Teams *
              </label>
              <input
                id="teams-count"
                type="number"
                min="0"
                className={styles.fieldInput}
                value={expectedTeamsCount}
                onChange={(e) => onPricingChange({ expectedTeamsCount: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="rate-override">
              Base Rate Override (Optional)
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>€</span>
              <input
                id="rate-override"
                type="number"
                step="0.01"
                min="0"
                style={{ paddingLeft: '28px' }}
                className={styles.fieldInput}
                placeholder="Use default from settings"
                value={baseRateOverride || ''}
                onChange={(e) => onPricingChange({ baseRateOverride: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
            </div>
            <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
              Leave empty to use global default rates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
