import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';

type WizardStep = 1 | 2 | 3;

interface StepProps {
  onNext: () => void;
  onBack?: () => void;
  isLoading?: boolean;
}

export function OfferCreateWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedAssociationId, setSelectedAssociationId] = useState<string>('');
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | ''>('');
  const [selectedLeagueIds, setSelectedLeagueIds] = useState<number[]>([]);
  const [contactId, setContactId] = useState<string>('');
  const [costModel, setCostModel] = useState<string>('');
  const [baseRateOverride, setBaseRateOverride] = useState<string>('');
  const [expectedTeamsCount, setExpectedTeamsCount] = useState<string>('');
  const [createdOfferId, setCreatedOfferId] = useState<string>('');

  // Fetch data
  const { data: associations = [] } = trpc.finance.associations.list.useQuery();
  const { data: seasons = [] } = trpc.teams.seasons.useQuery();
  const { data: leagues = [] } = trpc.teams.leagues.useQuery();

  // Get leagues for selected association and season
  const associationLeagues = selectedSeasonId && selectedAssociationId
    ? leagues.filter((l: any) => true) // In a real app, filter by association and season
    : [];

  // Mutations
  const createOffer = trpc.finance.offers.create.useMutation({
    onSuccess: (offer) => {
      setCreatedOfferId(offer._id);
      navigate(`/offers/${offer._id}`);
    },
  });

  const handleStep1Next = () => {
    if (selectedAssociationId && selectedSeasonId) {
      setStep(2);
    }
  };

  const handleStep2Next = () => {
    if (selectedLeagueIds.length > 0) {
      setStep(3);
    }
  };

  const handleStep3Next = async () => {
    try {
      await createOffer.mutateAsync({
        associationId: selectedAssociationId,
        seasonId: selectedSeasonId as number,
        leagueIds: selectedLeagueIds,
        contactId: contactId || undefined,
        costModel: costModel || undefined,
        baseRateOverride: baseRateOverride ? Number(baseRateOverride) : undefined,
        expectedTeamsCount: expectedTeamsCount ? Number(expectedTeamsCount) : undefined,
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const stepTitle = [
    'Select Association & Season',
    'Select Leagues',
    'Review & Create',
  ];

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '2rem',
    }}>
      {/* Progress Indicator */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '2rem',
        position: 'relative',
      }}>
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: step >= s ? '#0d6efd' : '#e9ecef',
                color: step >= s ? '#fff' : '#666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: 14,
                marginBottom: '0.5rem',
              }}
            >
              {s}
            </div>
            <p style={{
              margin: 0,
              fontSize: 12,
              color: step >= s ? '#0d6efd' : '#666',
              textAlign: 'center',
            }}>
              {['Association', 'Leagues', 'Review'][s - 1]}
            </p>
          </div>
        ))}
      </div>

      <div style={{
        background: '#fff',
        border: '1px solid #dee2e6',
        borderRadius: 8,
        padding: '2rem',
      }}>
        {/* Step 1: Select Association & Season */}
        {step === 1 && (
          <Step1
            associations={associations}
            seasons={seasons}
            selectedAssociationId={selectedAssociationId}
            selectedSeasonId={selectedSeasonId}
            onAssociationChange={setSelectedAssociationId}
            onSeasonChange={(val) => setSelectedSeasonId(val ? Number(val) : '')}
            onNext={handleStep1Next}
            isLoading={createOffer.isPending}
          />
        )}

        {/* Step 2: Select Leagues */}
        {step === 2 && (
          <Step2
            leagues={associationLeagues}
            selectedLeagueIds={selectedLeagueIds}
            onLeagueChange={(ids) => setSelectedLeagueIds(ids)}
            onNext={handleStep2Next}
            onBack={() => setStep(1)}
            isLoading={createOffer.isPending}
          />
        )}

        {/* Step 3: Review & Create */}
        {step === 3 && (
          <Step3
            selectedAssociation={associations.find((a: any) => a._id === selectedAssociationId)}
            selectedSeason={selectedSeasonId}
            selectedLeagues={associationLeagues.filter((l: any) => selectedLeagueIds.includes(l.id))}
            contactId={contactId}
            costModel={costModel}
            baseRateOverride={baseRateOverride}
            expectedTeamsCount={expectedTeamsCount}
            onContactIdChange={setContactId}
            onCostModelChange={setCostModel}
            onBaseRateOverrideChange={setBaseRateOverride}
            onExpectedTeamsCountChange={setExpectedTeamsCount}
            onNext={handleStep3Next}
            onBack={() => setStep(2)}
            isLoading={createOffer.isPending}
          />
        )}
      </div>
    </div>
  );
}

interface Step1Props extends StepProps {
  associations: any[];
  seasons: any[];
  selectedAssociationId: string;
  selectedSeasonId: number | '';
  onAssociationChange: (id: string) => void;
  onSeasonChange: (id: string) => void;
}

function Step1({
  associations,
  seasons,
  selectedAssociationId,
  selectedSeasonId,
  onAssociationChange,
  onSeasonChange,
  onNext,
  isLoading,
}: Step1Props) {
  return (
    <>
      <h2 style={{ margin: '0 0 1.5rem 0' }}>Select Association & Season</h2>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: '0.5rem' }}>
          Association *
        </label>
        <select
          value={selectedAssociationId}
          onChange={(e) => onAssociationChange(e.target.value)}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #ddd',
            borderRadius: 4,
            boxSizing: 'border-box',
          }}
        >
          <option value="">Choose an association</option>
          {associations.map((a: any) => (
            <option key={a._id} value={a._id}>{a.name}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: '0.5rem' }}>
          Season *
        </label>
        <select
          value={selectedSeasonId}
          onChange={(e) => onSeasonChange(e.target.value)}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #ddd',
            borderRadius: 4,
            boxSizing: 'border-box',
          }}
        >
          <option value="">Choose a season</option>
          {seasons.map((s: any) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <button
        onClick={onNext}
        disabled={!selectedAssociationId || !selectedSeasonId || isLoading}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: selectedAssociationId && selectedSeasonId ? '#0d6efd' : '#ddd',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: selectedAssociationId && selectedSeasonId ? 'pointer' : 'not-allowed',
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        Next
      </button>
    </>
  );
}

interface Step2Props extends StepProps {
  leagues: any[];
  selectedLeagueIds: number[];
  onLeagueChange: (ids: number[]) => void;
  onBack: () => void;
}

function Step2({
  leagues,
  selectedLeagueIds,
  onLeagueChange,
  onNext,
  onBack,
  isLoading,
}: Step2Props) {
  return (
    <>
      <h2 style={{ margin: '0 0 1.5rem 0' }}>Select Leagues</h2>

      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ margin: '0 0 1rem 0', color: '#666' }}>
          Selected: {selectedLeagueIds.length} of {leagues.length} leagues
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {leagues.map((league: any) => (
            <label key={league.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={selectedLeagueIds.includes(league.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    onLeagueChange([...selectedLeagueIds, league.id]);
                  } else {
                    onLeagueChange(selectedLeagueIds.filter((id) => id !== league.id));
                  }
                }}
                disabled={isLoading}
              />
              <span>{league.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={onBack}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={selectedLeagueIds.length === 0 || isLoading}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: selectedLeagueIds.length > 0 ? '#0d6efd' : '#ddd',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: selectedLeagueIds.length > 0 && !isLoading ? 'pointer' : 'not-allowed',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Next
        </button>
      </div>
    </>
  );
}

interface Step3Props extends StepProps {
  selectedAssociation: any;
  selectedSeason: number | '';
  selectedLeagues: any[];
  contactId: string;
  costModel: string;
  baseRateOverride: string;
  expectedTeamsCount: string;
  onContactIdChange: (id: string) => void;
  onCostModelChange: (model: string) => void;
  onBaseRateOverrideChange: (override: string) => void;
  onExpectedTeamsCountChange: (count: string) => void;
  onBack: () => void;
}

function Step3({
  selectedAssociation,
  selectedSeason,
  selectedLeagues,
  contactId,
  costModel,
  baseRateOverride,
  expectedTeamsCount,
  onContactIdChange,
  onCostModelChange,
  onBaseRateOverrideChange,
  onExpectedTeamsCountChange,
  onNext,
  onBack,
  isLoading,
}: Step3Props) {
  return (
    <>
      <h2 style={{ margin: '0 0 1.5rem 0' }}>Review & Create Offer</h2>

      <div style={{
        background: '#f8f9fa',
        padding: '1rem',
        borderRadius: 4,
        marginBottom: '1.5rem',
      }}>
        <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: 12 }}>
          <strong>Association:</strong> {selectedAssociation?.name}
        </p>
        <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: 12 }}>
          <strong>Season:</strong> {selectedSeason}
        </p>
        <p style={{ margin: '0', color: '#666', fontSize: 12 }}>
          <strong>Leagues:</strong> {selectedLeagues.length} selected
        </p>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: '0.5rem' }}>
            Contact ID (Optional)
          </label>
          <input
            type="text"
            value={contactId}
            onChange={(e) => onContactIdChange(e.target.value)}
            disabled={isLoading}
            placeholder="Enter contact ID"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: 4,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: '0.5rem' }}>
            Cost Model (Optional)
          </label>
          <input
            type="text"
            value={costModel}
            onChange={(e) => onCostModelChange(e.target.value)}
            disabled={isLoading}
            placeholder="Enter cost model"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: 4,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: '0.5rem' }}>
            Base Rate Override (Optional)
          </label>
          <input
            type="number"
            step="0.01"
            value={baseRateOverride}
            onChange={(e) => onBaseRateOverrideChange(e.target.value)}
            disabled={isLoading}
            placeholder="0.00"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: 4,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: '0.5rem' }}>
            Expected Teams Count (Optional)
          </label>
          <input
            type="number"
            step="1"
            min="0"
            value={expectedTeamsCount}
            onChange={(e) => onExpectedTeamsCountChange(e.target.value)}
            disabled={isLoading}
            placeholder="0"
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: 4,
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={onBack}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: '#0d6efd',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {isLoading ? 'Creating…' : 'Create Offer'}
        </button>
      </div>
    </>
  );
}

