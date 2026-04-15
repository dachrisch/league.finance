// src/client/components/Offer/Step1/Step1.tsx

import { PasteExtractBlock } from './PasteExtractBlock';
import { UseExistingBlock } from './UseExistingBlock';
import { SeasonBlock } from './SeasonBlock';
import type { ExtractedData, PathChoice } from '../types';
import styles from '../../../styles/OfferWizard.module.css';

interface Association {
  _id: string;
  name: string;
}

interface Contact {
  _id: string;
  name: string;
}

interface Season {
  _id: string;
  year: number;
}

interface Step1Props {
  pasteInput: string;
  pathChoice?: PathChoice;
  selectedAssociationId?: string;
  selectedContactId?: string;
  selectedSeasonId?: string;
  isExtracting: boolean;
  extractedData?: ExtractedData;
  extractionError?: string;
  associations: Association[];
  contacts: Contact[];
  seasons: Season[];
  onUpdatePasteInput: (text: string) => void;
  onSelectPath: (path: PathChoice) => void;
  onExtract: (text: string) => void;
  onSelectAssociation: (id: string) => void;
  onSelectContact: (id: string) => void;
  onSelectSeason: (id: string) => void;
  onUpdateExtractedData: (data: Partial<ExtractedData>) => void;
  onNext: () => void;
  onCancel: () => void;
}

export function Step1({
  pasteInput,
  pathChoice,
  selectedAssociationId,
  selectedContactId,
  selectedSeasonId,
  isExtracting,
  extractedData,
  extractionError,
  associations,
  contacts,
  seasons,
  onUpdatePasteInput,
  onSelectPath,
  onExtract,
  onSelectAssociation,
  onSelectContact,
  onSelectSeason,
  onUpdateExtractedData,
  onNext,
  onCancel,
}: Step1Props) {
  // Check if user has filled in all required fields for either path
  const hasExtractedData = extractedData && selectedSeasonId;
  const hasExistingData = selectedAssociationId && selectedContactId && selectedSeasonId;

  // Allow proceeding if either path has complete data
  const canProceed = hasExtractedData || hasExistingData;

  // Map seasons for UseExistingBlock (which expects { _id, name, year: string })
  const existingSeasons = seasons.map(s => ({
    _id: s._id,
    name: `Season ${s.year}`,
    year: String(s.year)
  }));

  return (
    <div className={styles.wizard}>
      <div className={styles.wizardHeader}>
        <h1 className={styles.wizardTitle}>Create New Offer</h1>
        <div className={styles.progressIndicator} role="progressbar" aria-valuenow={1} aria-valuemin={1} aria-valuemax={2}>
          <div className={styles.progressStep}>
            <div className={`${styles.progressDot} ${styles.active}`} aria-current="step" aria-label="Step 1: Association, Contact & Season">1</div>
            <span className={styles.progressLabel}>Association, Contact & Season</span>
          </div>
          <span className={styles.progressSeparator} aria-hidden="true">›</span>
          <div className={styles.progressStep}>
            <div className={styles.progressDot} aria-label="Step 2: Pricing & Leagues">2</div>
            <span className={styles.progressLabel}>Pricing & Leagues</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px' }}>
        <PasteExtractBlock
          pasteInput={pasteInput}
          isExtracting={isExtracting}
          extractionError={extractionError}
          extractedData={extractedData}
          onInputChange={onUpdatePasteInput}
          onExtract={(text) => {
            onSelectPath('paste');
            onExtract(text);
          }}
          onEmailChange={(email) => onUpdateExtractedData({ email })}
          onPhoneChange={(phone) => onUpdateExtractedData({ phone })}
        />

        <div className={styles.divider}>or use existing records</div>

        <UseExistingBlock
          associations={associations}
          contacts={contacts}
          seasons={existingSeasons}
          selectedAssociationId={selectedAssociationId}
          selectedContactId={selectedContactId}
          selectedSeasonId={selectedSeasonId}
          onAssociationChange={onSelectAssociation}
          onContactChange={onSelectContact}
          onSeasonChange={onSelectSeason}
          isActive={pathChoice === 'existing'}
          onToggle={() => onSelectPath(pathChoice === 'existing' ? undefined : 'existing')}
        />

        {pathChoice === 'paste' && (
          <SeasonBlock
            seasons={seasons}
            selectedSeasonId={selectedSeasonId}
            onSeasonChange={onSelectSeason}
            showBlock={true}
          />
        )}
      </div>

      <div className={styles.wizardFooter}>
        <span className={styles.footerHint}>Step 1 of 2</span>
        <div className={styles.footerActions}>
          <button className={`${styles.button} ${styles.buttonGhost}`} onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={onNext}
            disabled={!canProceed}
          >
            Next: Pricing & Leagues →
          </button>
        </div>
      </div>
    </div>
  );
}
