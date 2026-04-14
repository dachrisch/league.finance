// src/client/components/Offer/Step1/UseExistingBlock.tsx

import styles from '../../../styles/OfferWizard.module.css';

interface UseExistingBlockProps {
  associations: Array<{ _id: string; name: string }>;
  contacts: Array<{ _id: string; name: string }>;
  seasons: Array<{ _id: string; name: string; year: string }>;
  selectedAssociationId?: string;
  selectedContactId?: string;
  selectedSeasonId?: string;
  onAssociationChange: (id: string) => void;
  onContactChange: (id: string) => void;
  onSeasonChange: (id: string) => void;
  isActive: boolean;
  onToggle: () => void;
}

export function UseExistingBlock({
  associations,
  contacts,
  seasons,
  selectedAssociationId,
  selectedContactId,
  selectedSeasonId,
  onAssociationChange,
  onContactChange,
  onSeasonChange,
  isActive,
  onToggle,
}: UseExistingBlockProps) {
  const isDone = selectedAssociationId && selectedContactId && selectedSeasonId;

  return (
    <div className={styles.block}>
      <div
        className={`${styles.blockHeader} ${isActive ? styles.open : ''}`}
        onClick={onToggle}
        style={{ cursor: 'pointer' }}
      >
        <div className={`${styles.blockIcon} ${isDone ? styles.done : (isActive ? styles.active : '')}`}>
          {isDone ? '✓' : '1'}
        </div>
        <div className={styles.blockText}>
          <strong className={styles.blockTitle}>Pick existing</strong>
          <span className={styles.blockSubtitle}>
            Select from your database
          </span>
        </div>
        <span className={`${styles.blockChevron} ${isActive ? styles.open : ''}`}>▼</span>
      </div>

      <div className={`${styles.blockBody} ${isActive ? styles.open : ''}`}>
        <div className={styles.blockInner}>
          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="association-select">
              Association *
            </label>
            <select
              id="association-select"
              className={styles.fieldSelect}
              value={selectedAssociationId || ''}
              onChange={(e) => onAssociationChange(e.target.value)}
            >
              <option value="">Select association...</option>
              {associations.map((assoc) => (
                <option key={assoc._id} value={assoc._id}>
                  {assoc.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="contact-select">
              Contact *
            </label>
            <select
              id="contact-select"
              className={styles.fieldSelect}
              value={selectedContactId || ''}
              onChange={(e) => onContactChange(e.target.value)}
              disabled={!selectedAssociationId}
            >
              <option value="">Select contact...</option>
              {contacts.map((contact) => (
                <option key={contact._id} value={contact._id}>
                  {contact.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel} htmlFor="season-select">
              Season *
            </label>
            <select
              id="season-select"
              className={styles.fieldSelect}
              value={selectedSeasonId || ''}
              onChange={(e) => onSeasonChange(e.target.value)}
            >
              <option value="">Select season...</option>
              {seasons.map((season) => (
                <option key={season._id} value={season._id}>
                  {season.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
