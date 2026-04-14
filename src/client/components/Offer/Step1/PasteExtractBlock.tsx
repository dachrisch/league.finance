// src/client/components/Offer/Step1/PasteExtractBlock.tsx

import { useMemo, useState } from 'react';
import type { ExtractedData } from '../types';
import { getExtractionFeedback } from '../../../hooks/useExtraction';
import styles from '../../../styles/OfferWizard.module.css';

interface PasteExtractBlockProps {
  pasteInput: string;
  isExtracting: boolean;
  extractionError?: string;
  extractedData?: ExtractedData;
  onInputChange: (text: string) => void;
  onExtract: (text: string) => void;
  onEmailChange?: (email: string) => void;
  onPhoneChange?: (phone: string) => void;
}

export function PasteExtractBlock({
  pasteInput,
  isExtracting,
  extractionError,
  extractedData,
  onInputChange,
  onExtract,
  onEmailChange,
  onPhoneChange,
}: PasteExtractBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const feedback = useMemo(
    () => (extractedData ? getExtractionFeedback(extractedData) : null),
    [extractedData]
  );

  const isDisabled = !pasteInput.trim() || isExtracting;
  const shouldShowBody = isExpanded || extractedData;

  return (
    <div className={styles.block}>
      <div
        className={`${styles.blockHeader} ${shouldShowBody ? styles.open : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer' }}
      >
        <div className={`${styles.blockIcon} ${extractedData ? styles.done : styles.active}`}>
          {extractedData ? '✓' : '1'}
        </div>
        <div className={styles.blockText}>
          <strong className={styles.blockTitle}>Paste & extract</strong>
          <span className={styles.blockSubtitle}>
            {extractedData
              ? `${extractedData.organizationName} · ${extractedData.contactName}`
              : 'Auto-fill from contact text'}
          </span>
        </div>
        <span className={styles.blockChevron}>▼</span>
      </div>

      <div className={`${styles.blockBody} ${shouldShowBody ? styles.open : ''}`}>
        <div className={styles.blockInner}>
          {/* Paste textarea */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>
              Paste organization & contact text
              <textarea
                className={styles.fieldTextarea}
                placeholder={`e.g. AFCV NRW e.V.\nFabian Pawlowski\nHalterner Straße 193, 45770 Marl\nf.pawlowski@afcvnrw.de`}
                value={pasteInput}
                onChange={(e) => onInputChange(e.target.value)}
                disabled={isExtracting}
              />
            </label>
          </div>

          {/* Auto-fill button + status */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className={`${styles.button} ${styles.buttonPrimary} ${styles.buttonSmall}`}
              onClick={() => onExtract(pasteInput)}
              disabled={isDisabled}
            >
              ↯ Auto-fill
            </button>
            {isExtracting && (
              <span className={`${styles.tag} ${styles.tagInfo}`}>
                …extracting
              </span>
            )}
            {extractionError && (
              <span className={`${styles.tag} ${styles.tagInfo}`} style={{color: '#dc2626', background: '#fee2e2', borderColor: '#fecaca'}}>
                ✕ {extractionError}
              </span>
            )}
            {feedback && !isExtracting && (
              <span
                className={`${styles.tag} ${
                  feedback.confidence === 'high'
                    ? styles.tagSuccess
                    : styles.tagInfo
                }`}
              >
                {feedback.message}
              </span>
            )}
          </div>

          {/* Extracted fields display */}
          {extractedData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Organization *</label>
                <input
                  type="text"
                  className={`${styles.fieldInput}`}
                  disabled
                  value={extractedData.organizationName}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label className={styles.fieldLabel} style={{ marginBottom: '8px' }}>
                  Address
                </label>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Street *</label>
                  <input
                    type="text"
                    className={styles.fieldInput}
                    disabled
                    value={extractedData.street}
                  />
                </div>

                <div className={`${styles.fieldRow}`}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>City *</label>
                    <input
                      type="text"
                      className={styles.fieldInput}
                      disabled
                      value={extractedData.city}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Postal Code *</label>
                    <input
                      type="text"
                      className={styles.fieldInput}
                      disabled
                      value={extractedData.postalCode}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Country *</label>
                  <input
                    type="text"
                    className={styles.fieldInput}
                    disabled
                    value={extractedData.country}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label className={styles.fieldLabel} style={{ marginBottom: '8px' }}>
                  Contact Information
                </label>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Contact Name *</label>
                  <input
                    type="text"
                    className={styles.fieldInput}
                    disabled
                    value={extractedData.contactName}
                  />
                </div>

                <div className={`${styles.fieldRow}`}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Email *</label>
                    <input
                      type="email"
                      className={styles.fieldInput}
                      value={extractedData.email}
                      onChange={(e) => onEmailChange?.(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Phone (optional)</label>
                  <input
                    type="tel"
                    className={styles.fieldInput}
                    placeholder="+49 …"
                    value={extractedData.phone || ''}
                    onChange={(e) => onPhoneChange?.(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
