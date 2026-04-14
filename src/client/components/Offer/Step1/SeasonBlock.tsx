// src/client/components/Offer/Step1/SeasonBlock.tsx

import { useState } from 'react';
import styles from '../../../styles/OfferWizard.module.css';

interface Season {
  _id: string;
  year: number;
}

interface SeasonBlockProps {
  seasons: Season[];
  selectedSeasonId: string;
  onSeasonChange: (id: string) => void;
  showBlock: boolean;
}

export function SeasonBlock({
  seasons,
  selectedSeasonId,
  onSeasonChange,
  showBlock,
}: SeasonBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!showBlock) return null;

  const shouldShowBody = isExpanded || selectedSeasonId;

  return (
    <div className={styles.block}>
      <div
        className={`${styles.blockHeader} ${shouldShowBody ? styles.open : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer' }}
      >
        <div className={`${styles.blockIcon} ${selectedSeasonId ? styles.done : styles.active}`}>
          {selectedSeasonId ? '✓' : '2'}
        </div>
        <div className={styles.blockText}>
          <strong className={styles.blockTitle}>Season</strong>
          <span className={styles.blockSubtitle}>
            Required to complete the offer
          </span>
        </div>
        <span className={styles.blockChevron}>▼</span>
      </div>

      <div className={`${styles.blockBody} ${shouldShowBody ? styles.open : ''}`}>
        <div className={styles.blockInner}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="season-paste-select">
              Season *
            </label>
            <select
              id="season-paste-select"
              className={styles.fieldSelect}
              value={selectedSeasonId}
              onChange={(e) => onSeasonChange(e.target.value)}
            >
              <option value="">-- Select season --</option>
              {seasons.map((season) => (
                <option key={season._id} value={season._id}>
                  {season.year}
                </option>
              ))}
            </select>
          </div>

          {selectedSeasonId && (
            <p style={{ fontSize: '11px', color: '#6b7280', margin: '8px 0 0 0' }}>
              ℹ️ Selected season determines available leagues in the next step
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
