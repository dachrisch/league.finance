// src/client/components/Offer/Step2/CategoryGroup.tsx

import { useState } from 'react';
import styles from '../../../styles/OfferWizard.module.css';

interface League {
  _id: string;
  name: string;
}

interface CategoryGroupProps {
  title: string;
  leagues: League[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  defaultOpen?: boolean;
}

export function CategoryGroup({
  title,
  leagues,
  selectedIds,
  onToggle,
  defaultOpen = true,
}: CategoryGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (leagues.length === 0) return null;

  return (
    <div className={styles.leagueCategory}>
      <div className={styles.leagueCategoryHeader} onClick={() => setIsOpen(!isOpen)}>
        <span className={`${styles.leagueCategoryChevron} ${isOpen ? styles.open : ''}`}>▼</span>
        <span>{title}</span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#6b7280' }}>
          {leagues.length} leagues
        </span>
      </div>

      <div className={`${styles.leagueCategoryContent} ${isOpen ? styles.open : ''}`}>
        <div className={styles.leagueCategoryList}>
          {leagues.map((league) => (
            <div
              key={league._id}
              className={styles.leagueItem}
              onClick={() => onToggle(league._id)}
            >
              <input
                type="checkbox"
                className={styles.leagueCheckbox}
                checked={selectedIds.includes(league._id)}
                onChange={() => {}} // Controlled by parent
              />
              <span className={styles.leagueName}>{league.name}</span>
              {selectedIds.includes(league._id) && (
                <span className={styles.leagueCheckmark}>✓</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
