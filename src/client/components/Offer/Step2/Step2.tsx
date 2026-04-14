// src/client/components/Offer/Step2/Step2.tsx

import { SummarySection } from './SummarySection';
import { PricingSection } from './PricingSection';
import { LeagueSelectorSection } from './LeagueSelectorSection';
import type { PricingConfig } from '../types';
import styles from '../../../styles/OfferWizard.module.css';

interface Step2Props {
  summary: {
    associationName: string;
    contactName: string;
    seasonYear?: string;
  };
  pricing: PricingConfig;
  leagues: any[];
  selectedLeagueIds: string[];
  leagueSearchTerm: string;
  leagueFilterType: 'All' | 'Youth' | 'Regional' | 'Division' | 'Other';
  onBack: () => void;
  onCancel: () => void;
  onCreate: () => void;
  onPricingChange: (pricing: Partial<PricingConfig>) => void;
  onToggleLeague: (id: string) => void;
  onSearchChange: (term: string) => void;
  onFilterChange: (type: any) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onEditStep1: () => void;
  isSubmitting: boolean;
}

export function Step2({
  summary,
  pricing,
  leagues,
  selectedLeagueIds,
  leagueSearchTerm,
  leagueFilterType,
  onBack,
  onCancel,
  onCreate,
  onPricingChange,
  onToggleLeague,
  onSearchChange,
  onFilterChange,
  onSelectAll,
  onClearAll,
  onEditStep1,
  isSubmitting,
}: Step2Props) {
  const canCreate = selectedLeagueIds.length > 0 && pricing.expectedTeamsCount >= 0;

  return (
    <div className={styles.wizard} style={{ maxWidth: '650px' }}>
      <div className={styles.wizardHeader}>
        <h1 className={styles.wizardTitle}>Create New Offer</h1>
        <div className={styles.progressIndicator}>
          <div className={styles.progressStep}>
            <div className={`${styles.progressDot} ${styles.active}`} style={{ background: '#ecfdf5', color: '#10b981', borderColor: '#10b981' }}>✓</div>
            <span className={styles.progressLabel}>Association, Contact & Season</span>
          </div>
          <span className={styles.progressSeparator}>›</span>
          <div className={styles.progressStep}>
            <div className={`${styles.progressDot} ${styles.active}`}>2</div>
            <span className={styles.progressLabel}>Pricing & Leagues</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(90vh - 120px)' }}>
        <SummarySection
          associationName={summary.associationName}
          contactName={summary.contactName}
          seasonYear={summary.seasonYear}
          onEdit={onEditStep1}
        />

        <PricingSection
          costModel={pricing.costModel}
          baseRateOverride={pricing.baseRateOverride}
          expectedTeamsCount={pricing.expectedTeamsCount}
          onPricingChange={onPricingChange}
        />

        <LeagueSelectorSection
          leagues={leagues}
          selectedIds={selectedLeagueIds}
          searchTerm={leagueSearchTerm}
          filterType={leagueFilterType}
          onToggleLeague={onToggleLeague}
          onSearchChange={onSearchChange}
          onFilterChange={onFilterChange}
          onSelectAll={onSelectAll}
          onClearAll={onClearAll}
        />
      </div>

      <div className={styles.wizardFooter}>
        <button className={`${styles.button} ${styles.buttonGhost}`} onClick={onBack}>
          ← Back to Step 1
        </button>
        <div className={styles.footerActions}>
          <button className={`${styles.button} ${styles.buttonGhost}`} onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={onCreate}
            disabled={!canCreate || isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Offer & Finish'}
          </button>
        </div>
      </div>
    </div>
  );
}
