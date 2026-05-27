// src/client/components/Offer/OfferEditWizard.tsx

import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Step1 } from './Step1/Step1';
import { Step2 } from './Step2/Step2';
import { useOfferCreation } from '../../hooks/useOfferCreation';
import { trpc } from '../../lib/trpc';
import styles from '../../styles/OfferWizard.module.css';

interface Season {
  _id: string | number;
  name: string;
  slug: string;
}

interface Props {
  editId: string;
}

export function OfferEditWizard({ editId }: Props) {
  const navigate = useNavigate();
  const wizard = useOfferCreation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Queries
  const { data: associations = [] } = trpc.finance.associations.list.useQuery();
  const { data: contacts = [] } = trpc.finance.contacts.list.useQuery();
  const { data: seasons = [] } = trpc.finance.seasons.list.useQuery() as { data?: Season[] };
  
  const { data: existingOfferData, isLoading: isLoadingOffer } = trpc.finance.offers.get.useQuery(
    { id: editId },
    { enabled: !!editId }
  );

  // Initialize with existing data
  useEffect(() => {
    if (hasInitialized) return;

    if (editId && existingOfferData) {
      // Use existingOfferData.offer if it follows the new format, or just existingOfferData
      wizard.resetWithData(existingOfferData);
      setHasInitialized(true);
    }
  }, [editId, existingOfferData, hasInitialized, wizard]);

  // Get leagues for selected season
  const { data: leagues = [] } = trpc.finance.leagues.listBySeason.useQuery(
    { seasonId: wizard.step1.selectedSeasonId || '' },
    { enabled: !!wizard.step1.selectedSeasonId }
  );

  // Mutation
  const updateMutation = trpc.finance.offers.update.useMutation();

  // Handlers
  const handleSaveOffer = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const associationId = wizard.step1.selectedAssociationId;
      const contactId = wizard.step1.selectedContactId;

      if (!associationId || !contactId || !wizard.step1.selectedSeasonId) {
        throw new Error('Missing required information: association, contact, or season');
      }

      const payload = {
        associationId,
        contactId,
        seasonId: parseInt(wizard.step1.selectedSeasonId),
        ...wizard.step2.pricing,
        leagueIds: wizard.step2.selectedLeagueIds.map(id => parseInt(id)),
      };

      await updateMutation.mutateAsync({ id: editId, data: payload as any });
      navigate(`/offers/${editId}`);
    } catch (err: any) {
      let errorMessage = 'Failed to save offer. Please check your information and try again.';

      if (err?.message && !err.message.includes('TRPCClientError')) {
        errorMessage = err.message;
      } else if (err?.data?.message) {
        errorMessage = err.data.message;
      } else if (err?.shape?.message) {
        errorMessage = err.shape.message;
      }

      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Summary mapping
  const summary = useMemo(() => {
    const assoc = associations.find(a => a._id === wizard.step1.selectedAssociationId);
    const contact = contacts.find(c => c._id === wizard.step1.selectedContactId);
    const season = seasons.find(s => s._id.toString() === wizard.step1.selectedSeasonId?.toString());

    return {
      associationName: assoc?.name || '',
      contactName: contact?.name || '',
      seasonYear: season?.name || '',
    };
  }, [wizard.step1, associations, contacts, seasons]);

  if (isLoadingOffer) {
    return <div className={styles.wizard} style={{ padding: '40px', textAlign: 'center' }}>Loading offer data...</div>;
  }

  const canSave = wizard.step1.selectedAssociationId && 
                  wizard.step1.selectedContactId && 
                  wizard.step1.selectedSeasonId &&
                  wizard.step2.selectedLeagueIds.length > 0 && 
                  wizard.step2.pricing.expectedTeamsCount >= 0;

  return (
    <div className={styles.wizard} style={{ maxWidth: '800px' }}>
      <div className={styles.wizardHeader}>
        <h1 className={styles.wizardTitle}>Edit Offer</h1>
      </div>

      <div style={{ padding: '0 0 20px 0' }}>
        <Step1
          {...wizard.step1}
          submitError={submitError}
          associations={associations}
          contacts={contacts}
          seasons={seasons.map(s => ({ ...s, _id: s._id.toString() }))}
          onUpdatePasteInput={wizard.updatePasteInput}
          onSelectPath={wizard.selectPath}
          onExtract={() => {}} // Not used in edit mode
          onSelectAssociation={wizard.selectAssociation}
          onSelectContact={wizard.selectContact}
          onSelectSeason={wizard.selectSeason}
          onUpdateExtractedData={wizard.updateExtractedData}
          onNext={() => {}} // Not used in unified view
          onCancel={() => {}} // Not used in unified view
          isEdit={true}
          isUnified={true}
        />

        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '20px' }}>
          <Step2
            summary={summary}
            pricing={wizard.step2.pricing}
            leagues={leagues}
            selectedLeagueIds={wizard.step2.selectedLeagueIds}
            leagueSearchTerm={wizard.step2.leagueSearchTerm}
            leagueFilterType={wizard.step2.leagueFilterType || 'All'}
            submitError={submitError}
            onBack={() => {}} // Not used in unified view
            onCancel={() => {}} // Not used in unified view
            onCreate={handleSaveOffer}
            onPricingChange={wizard.updatePricing}
            onToggleLeague={wizard.toggleLeague}
            onSearchChange={wizard.updateLeagueSearch}
            onFilterChange={wizard.updateLeagueFilter}
            onSelectAll={() => wizard.setSelectedLeagues(leagues.map(l => l._id.toString()))}
            onClearAll={() => wizard.setSelectedLeagues([])}
            onEditStep1={() => {}} // Already on the same page
            isSubmitting={isSubmitting}
            isEdit={true}
            isUnified={true}
          />
        </div>
      </div>

      <div className={styles.wizardFooter}>
        <div className={styles.footerHint}>Editing Offer {editId}</div>
        <div className={styles.footerActions}>
          <button className={`${styles.button} ${styles.buttonGhost}`} onClick={() => navigate(`/offers/${editId}`)}>
            Cancel
          </button>
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={handleSaveOffer}
            disabled={!canSave || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
