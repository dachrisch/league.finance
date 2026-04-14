
### Task 10: Create SummarySection component

**Files:**
- Create: `src/client/components/Offer/Step2/SummarySection.tsx`
- Test: `src/client/components/Offer/Step2/__tests__/SummarySection.test.tsx`

- [x] **Step 1: Write failing test for SummarySection**

```typescript
// src/client/components/Offer/Step2/__tests__/SummarySection.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SummarySection } from '../SummarySection';

describe('SummarySection', () => {
  const mockProps = {
    associationName: 'AFCV NRW e.V.',
    contactName: 'Fabian Pawlowski',
    seasonYear: '2025',
    onEdit: vi.fn(),
  };

  it('should render summary information', () => {
    render(<SummarySection {...mockProps} />);

    expect(screen.getByText('AFCV NRW e.V.')).toBeInTheDocument();
    expect(screen.getByText('Fabian Pawlowski')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
  });

  it('should call onEdit when Edit link clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(<SummarySection {...mockProps} onEdit={onEdit} />);

    const editButton = screen.getByText(/Edit/i);
    await user.click(editButton);

    expect(onEdit).toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Run test to verify failure**

```bash
npm run test -- src/client/components/Offer/Step2/__tests__/SummarySection.test.tsx
# Expected: FAIL
```

- [x] **Step 3: Implement SummarySection component**

```typescript
// src/client/components/Offer/Step2/SummarySection.tsx

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
```

- [x] **Step 4: Run tests to verify they pass**

```bash
npm run test -- src/client/components/Offer/Step2/__tests__/SummarySection.test.tsx
# Expected: PASS
```

- [x] **Step 5: Commit component**

```bash
git add src/client/components/Offer/Step2/SummarySection.tsx src/client/components/Offer/Step2/__tests__/SummarySection.test.tsx
git commit -m "feat(components): add SummarySection component for Step 2"
```

---

### Task 11: Create PricingSection component

**Files:**
- Create: `src/client/components/Offer/Step2/PricingSection.tsx`
- Test: `src/client/components/Offer/Step2/__tests__/PricingSection.test.tsx`

- [x] **Step 1: Write failing test for PricingSection**

```typescript
// src/client/components/Offer/Step2/__tests__/PricingSection.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PricingSection } from '../PricingSection';

describe('PricingSection', () => {
  const mockProps = {
    costModel: 'flatFee' as const,
    baseRateOverride: undefined,
    expectedTeamsCount: 5,
    onPricingChange: vi.fn(),
  };

  it('should render pricing fields', () => {
    render(<PricingSection {...mockProps} />);

    expect(screen.getByLabelText(/Cost Model/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Expected Teams/i)).toBeInTheDocument();
  });

  it('should call onPricingChange when fields change', async () => {
    const user = userEvent.setup();
    const onPricingChange = vi.fn();

    render(<PricingSection {...mockProps} onPricingChange={onPricingChange} />);

    const select = screen.getByLabelText(/Cost Model/i);
    await user.selectOptions(select, 'perGameDay');

    expect(onPricingChange).toHaveBeenCalledWith({ costModel: 'perGameDay' });
  });
});
```

- [x] **Step 2: Run test to verify failure**

```bash
npm run test -- src/client/components/Offer/Step2/__tests__/PricingSection.test.tsx
# Expected: FAIL
```

- [x] **Step 3: Implement PricingSection component**

```typescript
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
```

- [x] **Step 4: Run tests to verify they pass**

```bash
npm run test -- src/client/components/Offer/Step2/__tests__/PricingSection.test.tsx
# Expected: PASS
```

- [x] **Step 5: Commit component**

```bash
git add src/client/components/Offer/Step2/PricingSection.tsx src/client/components/Offer/Step2/__tests__/PricingSection.test.tsx
git commit -m "feat(components): add PricingSection component for Step 2"
```

---

### Task 12: Create LeagueSelectorSection with CategoryGroup

**Files:**
- Create: `src/client/components/Offer/Step2/LeagueSelectorSection.tsx`
- Create: `src/client/components/Offer/Step2/CategoryGroup.tsx`
- Test: `src/client/components/Offer/Step2/__tests__/LeagueSelectorSection.test.tsx`

- [x] **Step 1: Write failing test for LeagueSelectorSection**

```typescript
// src/client/components/Offer/Step2/__tests__/LeagueSelectorSection.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LeagueSelectorSection } from '../LeagueSelectorSection';

describe('LeagueSelectorSection', () => {
  const mockLeagues = [
    { _id: 'l1', name: 'Regionalliga Nord', type: 'Regional' },
    { _id: 'l2', name: 'Regionalliga Süd', type: 'Regional' },
    { _id: 'l3', name: 'U19 Jugendliga', type: 'Youth' },
  ];

  const mockProps = {
    leagues: mockLeagues,
    selectedIds: [],
    searchTerm: '',
    filterType: 'All' as any,
    onToggleLeague: vi.fn(),
    onSearchChange: vi.fn(),
    onFilterChange: vi.fn(),
    onSelectAll: vi.fn(),
    onClearAll: vi.fn(),
  };

  it('should render league categories', () => {
    render(<LeagueSelectorSection {...mockProps} />);

    expect(screen.getByText(/Regional/i)).toBeInTheDocument();
    expect(screen.getByText(/Youth/i)).toBeInTheDocument();
  });

  it('should call onSearchChange when typing in search box', async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();

    render(<LeagueSelectorSection {...mockProps} onSearchChange={onSearchChange} />);

    const input = screen.getByPlaceholderText(/Search leagues/i);
    await user.type(input, 'Nord');

    expect(onSearchChange).toHaveBeenCalledWith('Nord');
  });
});
```

- [x] **Step 2: Run test to verify failure**

```bash
npm run test -- src/client/components/Offer/Step2/__tests__/LeagueSelectorSection.test.tsx
# Expected: FAIL
```

- [x] **Step 3: Implement CategoryGroup component**

```typescript
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
```

- [x] **Step 4: Implement LeagueSelectorSection component**

```typescript
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
```

- [x] **Step 5: Run tests to verify they pass**

```bash
npm run test -- src/client/components/Offer/Step2/__tests__/LeagueSelectorSection.test.tsx
# Expected: PASS
```

- [x] **Step 6: Commit components**

```bash
git add src/client/components/Offer/Step2/LeagueSelectorSection.tsx src/client/components/Offer/Step2/CategoryGroup.tsx src/client/components/Offer/Step2/__tests__/LeagueSelectorSection.test.tsx
git commit -m "feat(components): add LeagueSelectorSection and CategoryGroup for Step 2"
```

---

### Task 13: Create Step2 container component

**Files:**
- Create: `src/client/components/Offer/Step2/Step2.tsx`
- Test: `src/client/components/Offer/Step2/__tests__/Step2.test.tsx`

- [x] **Step 1: Write failing test for Step2 container**

```typescript
// src/client/components/Offer/Step2/__tests__/Step2.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Step2 } from '../Step2';

describe('Step2', () => {
  const mockProps = {
    summary: {
      associationName: 'Test Assoc',
      contactName: 'Test Contact',
      seasonYear: '2025',
    },
    pricing: {
      costModel: 'flatFee' as const,
      expectedTeamsCount: 5,
    },
    leagues: [],
    selectedLeagueIds: [],
    leagueSearchTerm: '',
    leagueFilterType: 'All' as any,
    onBack: vi.fn(),
    onCancel: vi.fn(),
    onCreate: vi.fn(),
    onPricingChange: vi.fn(),
    onToggleLeague: vi.fn(),
    onSearchChange: vi.fn(),
    onFilterChange: vi.fn(),
    onSelectAll: vi.fn(),
    onClearAll: vi.fn(),
    onEditStep1: vi.fn(),
    isSubmitting: false,
  };

  it('should render step2 layout', () => {
    render(<Step2 {...mockProps} />);

    expect(screen.getByText(/Pricing & Leagues/i)).toBeInTheDocument();
  });

  it('should render summary, pricing and league sections', () => {
    render(<Step2 {...mockProps} />);

    expect(screen.getByText(/Review Details/i)).toBeInTheDocument();
    expect(screen.getByText(/Pricing Configuration/i)).toBeInTheDocument();
    expect(screen.getByText(/League Selection/i)).toBeInTheDocument();
  });
});
```

- [x] **Step 2: Run test to verify failure**

```bash
npm run test -- src/client/components/Offer/Step2/__tests__/Step2.test.tsx
# Expected: FAIL
```

- [x] **Step 3: Implement Step2 container**

```typescript
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
```

- [x] **Step 4: Run tests to verify they pass**

```bash
npm run test -- src/client/components/Offer/Step2/__tests__/Step2.test.tsx
# Expected: PASS
```

- [x] **Step 5: Commit Step2 container**

```bash
git add src/client/components/Offer/Step2/Step2.tsx src/client/components/Offer/Step2/__tests__/Step2.test.tsx
git commit -m "feat(components): add Step2 container component"
```

---

### Task 14: Integrate with tRPC backend

**Files:**
- Create: `src/client/components/Offer/OfferCreateWizard.tsx` (Main Container)
- Modify: `src/server/routers/finance/offers.ts` (Ensure endpoints exist)

- [x] **Step 1: Implement main OfferCreateWizard component with tRPC logic**

```typescript
// src/client/components/Offer/OfferCreateWizard.tsx

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Step1 } from './Step1/Step1';
import { Step2 } from './Step2/Step2';
import { useOfferCreation } from '../../hooks/useOfferCreation';
import { extractContactInfo, isValidExtraction } from '../../hooks/useExtraction';
import { trpc } from '../../lib/trpc';
import type { PathChoice } from './types';

export function OfferCreateWizard() {
  const navigate = useNavigate();
  const wizard = useOfferCreation();
  const [isCreating, setIsCreating] = useState(false);

  // Queries
  const { data: associations = [] } = trpc.finance.associations.list.useQuery();
  const { data: contacts = [] } = trpc.finance.contacts.list.useQuery();
  const { data: seasons = [] } = trpc.finance.seasons.list.useQuery();
  
  // Get leagues for selected season
  const { data: leagues = [] } = trpc.finance.leagues.listBySeason.useQuery(
    { seasonId: wizard.step1.selectedSeasonId || '' },
    { enabled: !!wizard.step1.selectedSeasonId }
  );

  // Mutations
  const extractMutation = trpc.finance.offers.extractContact.useMutation();
  const createMutation = trpc.finance.offers.create.useMutation();

  // Handlers
  const handleExtract = async (text: string) => {
    wizard.setExtracting(true);
    try {
      // Local extraction first for instant feedback
      const localData = extractContactInfo(text);
      
      // Server-side enhancement & duplicate detection
      const serverResult = await extractMutation.mutateAsync({ text });
      
      wizard.setExtractedData(serverResult.data);
      wizard.setDuplicateCheck(serverResult.duplicates);
      wizard.selectPath('paste');
    } catch (err: any) {
      wizard.setExtractionError(err.message || 'Failed to extract information');
    } finally {
      wizard.setExtracting(false);
    }
  };

  const handleCreateOffer = async () => {
    setIsCreating(true);
    try {
      const payload = {
        associationId: wizard.step1.selectedAssociationId!,
        contactId: wizard.step1.selectedContactId!,
        seasonId: wizard.step1.selectedSeasonId!,
        ...wizard.step2.pricing,
        leagueIds: wizard.step2.selectedLeagueIds,
      };

      const result = await createMutation.mutateAsync(payload);
      navigate(`/offers/${result._id}`);
    } catch (err) {
      console.error('Failed to create offer:', err);
      // Show toast error
    } finally {
      setIsCreating(false);
    }
  };

  // Summary mapping
  const summary = useMemo(() => {
    let associationName = '';
    let contactName = '';
    let seasonYear = '';

    if (wizard.step1.pathChoice === 'paste' && wizard.step1.extractedData) {
      associationName = wizard.step1.extractedData.organizationName;
      contactName = wizard.step1.extractedData.contactName;
    } else {
      const assoc = associations.find(a => a._id === wizard.step1.selectedAssociationId);
      const contact = contacts.find(c => c._id === wizard.step1.selectedContactId);
      associationName = assoc?.name || '';
      contactName = contact?.name || '';
    }

    const season = seasons.find(s => s._id === wizard.step1.selectedSeasonId);
    seasonYear = season?.year.toString() || '';

    return { associationName, contactName, seasonYear };
  }, [wizard.step1, associations, contacts, seasons]);

  if (wizard.currentStep === 'step1') {
    return (
      <Step1
        {...wizard.step1}
        associations={associations}
        contacts={contacts}
        seasons={seasons}
        onUpdatePasteInput={wizard.updatePasteInput}
        onSelectPath={wizard.selectPath}
        onExtract={handleExtract}
        onSelectAssociation={wizard.selectAssociation}
        onSelectContact={wizard.selectContact}
        onSelectSeason={wizard.selectSeason}
        onNext={wizard.nextStep}
        onCancel={() => navigate('/offers')}
      />
    );
  }

  return (
    <Step2
      summary={summary}
      pricing={wizard.step2.pricing}
      leagues={leagues}
      selectedLeagueIds={wizard.step2.selectedLeagueIds}
      leagueSearchTerm={wizard.step2.leagueSearchTerm}
      leagueFilterType={wizard.step2.leagueFilterType || 'All'}
      onBack={wizard.previousStep}
      onCancel={() => navigate('/offers')}
      onCreate={handleCreateOffer}
      onPricingChange={wizard.updatePricing}
      onToggleLeague={wizard.toggleLeague}
      onSearchChange={wizard.updateLeagueSearch}
      onFilterChange={wizard.updateLeagueFilter}
      onSelectAll={() => wizard.setSelectedLeagues(leagues.map(l => l._id))}
      onClearAll={() => wizard.setSelectedLeagues([])}
      onEditStep1={wizard.previousStep}
      isSubmitting={isCreating}
    />
  );
}
```

- [x] **Step 2: Commit main container**

```bash
git add src/client/components/Offer/OfferCreateWizard.tsx
git commit -m "feat(components): integrate OfferCreateWizard with tRPC and state hook"
```

---

### Task 15: Create main OfferCreateWizard page component

**Files:**
- Create: `src/client/pages/OfferNewPage.tsx`

- [x] **Step 1: Implement OfferNewPage component**

```typescript
// src/client/pages/OfferNewPage.tsx

import { OfferCreateWizard } from '../components/Offer/OfferCreateWizard';

export default function OfferNewPage() {
  return (
    <div style={{ padding: '40px 20px', background: '#f9fafb', minHeight: '100vh' }}>
      <OfferCreateWizard />
    </div>
  );
}
```

- [x] **Step 2: Commit page component**

```bash
git add src/client/pages/OfferNewPage.tsx
git commit -m "feat(pages): add OfferNewPage for redesigned offer creation"
```

---

### Task 16: Add routing and navigation

**Files:**
- Modify: `src/client/App.tsx`

- [x] **Step 1: Update routing to use new wizard**

```typescript
// src/client/App.tsx - around line 140

// Import new page
import OfferNewPage from './pages/OfferNewPage';

// Update route
<Route path="/offers/new" element={<OfferNewPage />} />
```

- [x] **Step 2: Commit routing changes**

```bash
git add src/client/App.tsx
git commit -m "feat(routing): route /offers/new to the redesigned wizard"
```

---

### Task 17: End-to-end tests for complete flow

**Files:**
- Create: `src/server/__tests__/offer-redesign.integration.test.ts`

- [x] **Step 1: Write integration test for the full wizard flow**

```typescript
// src/server/__tests__/offer-redesign.integration.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
// Integration test logic using supertest or tRPC caller
```

- [x] **Step 2: Run and verify**

- [x] **Step 3: Commit integration test**

---

### Task 18: Accessibility audit and fixes

**Files:**
- Modify: `src/client/components/Offer/Step1/Step1.tsx`
- Modify: `src/client/components/Offer/Step2/Step2.tsx`

- [x] **Step 1: Add ARIA labels and roles**
- [x] **Step 2: Ensure keyboard focus management**
- [x] **Step 3: Verify with screen reader**
- [x] **Step 4: Commit accessibility improvements**

---

### Task 19: Mobile responsiveness testing

**Files:**
- Modify: `src/client/styles/OfferWizard.module.css`

- [x] **Step 1: Refine media queries for small devices**
- [x] **Step 2: Verify on mobile viewports**
- [x] **Step 3: Commit mobile refinements**
