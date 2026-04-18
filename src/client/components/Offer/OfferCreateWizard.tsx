import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Step1 } from './Step1/Step1';
import { Step2 } from './Step2/Step2';
import { useOfferCreation } from '../../hooks/useOfferCreation';
import { trpc } from '../../lib/trpc';

interface Props {
  editId?: string;
}

export function OfferCreateWizard({ editId }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const wizard = useOfferCreation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Queries
  const { data: associations = [] } = trpc.finance.associations.list.useQuery();
  const { data: contacts = [] } = trpc.finance.contacts.list.useQuery();
  const { data: seasons = [] } = trpc.finance.seasons.list.useQuery();
  
  const { data: existingOffer, isLoading: isLoadingOffer } = trpc.finance.offers.get.useQuery(
    { id: editId! },
    { enabled: !!editId }
  );

  // Initialize with existing data or URL params
  useEffect(() => {
    if (hasInitialized) return;

    if (editId && existingOffer) {
      wizard.resetWithData(existingOffer.offer);
      setHasInitialized(true);
    } else if (!editId && seasons.length > 0) {
      // Handle "Quick Add" from dashboard (single or multiple)
      const leagueParam = searchParams.get('league') || searchParams.get('leagues');
      const seasonId = searchParams.get('season');
      
      if (leagueParam && seasonId) {
        const leagueIds = leagueParam.split(',');
        wizard.selectSeason(seasonId);
        wizard.setSelectedLeagues(leagueIds);
        wizard.selectPath('existing');
        setHasInitialized(true);
      }
    }
  }, [editId, existingOffer, hasInitialized, wizard, seasons, searchParams]);

  // Get leagues for selected season
  const { data: leagues = [] } = trpc.finance.leagues.listBySeason.useQuery(
    { seasonId: wizard.step1.selectedSeasonId || '' },
    { enabled: !!wizard.step1.selectedSeasonId }
  );

  // Mutations
  const extractMutation = trpc.finance.offers.extractContact.useMutation();
  const createMutation = trpc.finance.offers.create.useMutation();
  const updateMutation = trpc.finance.offers.update.useMutation();
  const createAssociationMutation = trpc.finance.associations.create.useMutation();
  const createContactMutation = trpc.finance.contacts.create.useMutation();

  // Handlers
  const handleExtract = async (text: string) => {
    wizard.setExtracting(true);
    try {
      const serverResult = await extractMutation.mutateAsync({ text });
      
      wizard.setExtractedData(serverResult.data);
      wizard.setDuplicateCheck(serverResult.duplicates);
      wizard.selectPath('paste');

      if (serverResult.duplicates.associationMatches?.length === 1 && serverResult.duplicates.associationMatches[0].type === 'exact') {
        wizard.selectAssociation(serverResult.duplicates.associationMatches[0]._id);
      }
      if (serverResult.duplicates.contactMatches?.length === 1 && serverResult.duplicates.contactMatches[0].type === 'exact') {
        wizard.selectContact(serverResult.duplicates.contactMatches[0]._id);
      }
    } catch (err: any) {
      wizard.setExtractionError(err.message || 'Failed to extract information');
    } finally {
      wizard.setExtracting(false);
    }
  };

  const handleSaveOffer = async () => {
    setIsSubmitting(true);
    try {
      let associationId = wizard.step1.selectedAssociationId;
      let contactId = wizard.step1.selectedContactId;

      // If in paste mode and no ID selected, create them first
      if (wizard.step1.pathChoice === 'paste' && wizard.step1.extractedData) {
        if (!associationId) {
          const newAssoc = await createAssociationMutation.mutateAsync({
            name: wizard.step1.extractedData.organizationName,
            address: {
              street: wizard.step1.extractedData.street,
              city: wizard.step1.extractedData.city,
              postalCode: wizard.step1.extractedData.postalCode,
              country: wizard.step1.extractedData.country,
            }
          });
          associationId = newAssoc._id;
        }

        if (!contactId) {
          const newContact = await createContactMutation.mutateAsync({
            name: wizard.step1.extractedData.contactName,
            email: wizard.step1.extractedData.email,
            phone: wizard.step1.extractedData.phone,
            address: {
              street: wizard.step1.extractedData.street,
              city: wizard.step1.extractedData.city,
              postalCode: wizard.step1.extractedData.postalCode,
              country: wizard.step1.extractedData.country,
            }
          });
          contactId = newContact._id;
        }
      }

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

      if (editId) {
        await updateMutation.mutateAsync({ id: editId, data: payload as any });
        navigate(`/offers/${editId}`);
      } else {
        const result = await createMutation.mutateAsync(payload);
        navigate(`/offers/${result._id}`);
      }
    } catch (err) {
      console.error('Failed to save offer:', err);
    } finally {
      setIsSubmitting(false);
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

    const season = seasons.find(s => s._id.toString() === wizard.step1.selectedSeasonId?.toString());
    seasonYear = season?.name || '';

    return { associationName, contactName, seasonYear };
  }, [wizard.step1, associations, contacts, seasons]);

  if (editId && isLoadingOffer) {
    return <div className="container">Loading offer data...</div>;
  }

  if (wizard.currentStep === 'step1') {
    return (
      <Step1
        {...wizard.step1}
        associations={associations}
        contacts={contacts}
        seasons={seasons.map(s => ({ ...s, _id: s._id.toString(), year: s.year }))}
        onUpdatePasteInput={wizard.updatePasteInput}
        onSelectPath={wizard.selectPath}
        onExtract={handleExtract}
        onSelectAssociation={(id) => {
          wizard.selectAssociation(id);
          if (wizard.step1.pathChoice !== 'existing') wizard.selectPath('existing');
        }}
        onSelectContact={(id) => {
          wizard.selectContact(id);
          if (wizard.step1.pathChoice !== 'existing') wizard.selectPath('existing');
        }}
        onSelectSeason={(id) => {
          wizard.selectSeason(id);
          if (wizard.step1.pathChoice !== 'existing' && wizard.step1.pathChoice !== 'paste') {
            wizard.selectPath('existing');
          }
        }}
        onUpdateExtractedData={wizard.updateExtractedData}
        onNext={wizard.nextStep}
        onCancel={() => navigate('/offers')}
        isEdit={!!editId}
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
      onCreate={handleSaveOffer}
      onPricingChange={wizard.updatePricing}
      onToggleLeague={wizard.toggleLeague}
      onSearchChange={wizard.updateLeagueSearch}
      onFilterChange={wizard.updateLeagueFilter}
      onSelectAll={() => wizard.setSelectedLeagues(leagues.map(l => l._id.toString()))}
      onClearAll={() => wizard.setSelectedLeagues([])}
      onEditStep1={wizard.previousStep}
      isSubmitting={isSubmitting}
      isEdit={!!editId}
    />
  );
}
