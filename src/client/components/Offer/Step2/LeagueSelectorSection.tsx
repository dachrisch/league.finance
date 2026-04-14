// src/client/components/Offer/Step2/LeagueSelectorSection.tsx

import { useMemo } from 'react';
import { CategoryGroup } from './CategoryGroup';
import styles from '../../../styles/OfferWizard.module.css';

interface League {
  _id: string;
  name: string;
  type?: string;
}

interface LeagueSelectorSectionProps {
  leagues: League[];
  selectedIds: string[];
  searchTerm: string;
  filterType: 'All' | 'Youth' | 'Regional' | 'Division' | 'Other';
  onToggleLeague: (id: string) => void;
  onSearchChange: (term: string) => void;
  onFilterChange: (type: any) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export function LeagueSelectorSection({
  leagues,
  selectedIds,
  searchTerm,
  filterType,
  onToggleLeague,
  onSearchChange,
  onFilterChange,
  onSelectAll,
  onClearAll,
}: LeagueSelectorSectionProps) {
  const filteredLeagues = useMemo(() => {
    return leagues.filter((league) => {
      const matchesSearch = league.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === 'All' || league.type === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [leagues, searchTerm, filterType]);

  const groupedLeagues = useMemo(() => {
    const groups: Record<string, League[]> = {};
    filteredLeagues.forEach((league) => {
      const type = league.type || 'Other';
      if (!groups[type]) groups[type] = [];
      groups[type].push(league);
    });
    return groups;
  }, [filteredLeagues]);

  const filters: Array<'All' | 'Youth' | 'Regional' | 'Division' | 'Other'> = [
    'All', 'Regional', 'Youth', 'Division', 'Other'
  ];

  return (
    <div className={styles.block}>
      <div className={styles.blockHeader}>
        <div className={`${styles.blockIcon} ${selectedIds.length > 0 ? styles.done : styles.active}`}>
          {selectedIds.length > 0 ? '✓' : '3'}
        </div>
        <div className={styles.blockText}>
          <strong className={styles.blockTitle}>League Selection</strong>
          <span className={styles.blockSubtitle}>
            Choose leagues included in this offer
          </span>
        </div>
        <span className={styles.blockChevron}>▼</span>
      </div>

      <div className={`${styles.blockBody} ${styles.open}`}>
        <div className={styles.blockInner}>
          {/* Search */}
          <div className={styles.leagueSearch}>
            <span className={styles.leagueSearchIcon}>🔍</span>
            <input
              type="text"
              className={`${styles.fieldInput} ${styles.leagueSearchInput}`}
              placeholder="Search leagues by name…"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className={styles.leagueFilters}>
            {filters.map((f) => (
              <button
                key={f}
                className={`${styles.leagueFilter} ${filterType === f ? styles.active : ''}`}
                onClick={() => onFilterChange(f)}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Bulk Actions */}
          <div className={styles.leagueSelectionCounter}>
            <div className={styles.leagueCounterBulkActions}>
              <span>{selectedIds.length} selected</span>
              <button className={styles.leagueCounterLink} onClick={onSelectAll} style={{ background: 'none', border: 'none', padding: 0 }}>
                Select filtered
              </button>
              <button className={styles.leagueCounterLink} onClick={onClearAll} style={{ background: 'none', border: 'none', padding: 0 }}>
                Clear selection
              </button>
            </div>
          </div>

          {/* Categories */}
          {Object.entries(groupedLeagues).map(([type, leagues]) => (
            <CategoryGroup
              key={type}
              title={type}
              leagues={leagues}
              selectedIds={selectedIds}
              onToggle={onToggleLeague}
            />
          ))}

          {filteredLeagues.length === 0 && (
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '12px', padding: '20px' }}>
              No leagues found matching your search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
