import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';

type WizardStep = 1 | 2 | 3 | 4;

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
  const [customPrices, setCustomPrices] = useState<Record<number, number>>({});
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
  const createOffer = trpc.finance.offers.create.useMutation();
  const addLeagues = trpc.finance.offers.addLeagues.useMutation();

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
      // Create offer
      const offer = await createOffer.mutateAsync({
        associationId: selectedAssociationId,
        seasonId: selectedSeasonId as number,
      });

      // TODO: Add leagues to offer with customPrices
      // This would require additional API integration

      setCreatedOfferId(offer._id);
      setStep(4);
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };

  const stepTitle = [
    'Select Association & Season',
    'Select Leagues',
    'Review & Customize',
    'Confirmation',
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
        {[1, 2, 3, 4].map((s) => (
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
              {['Association', 'Leagues', 'Customize', 'Done'][s - 1]}
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

        {/* Step 3: Review & Customize */}
        {step === 3 && (
          <Step3
            selectedAssociation={associations.find((a: any) => a._id === selectedAssociationId)}
            selectedSeason={selectedSeasonId}
            selectedLeagues={associationLeagues.filter((l: any) => selectedLeagueIds.includes(l.id))}
            customPrices={customPrices}
            onCustomPriceChange={(leagueId, price) => {
              setCustomPrices({ ...customPrices, [leagueId]: price });
            }}
            onNext={handleStep3Next}
            onBack={() => setStep(2)}
            isLoading={createOffer.isPending}
          />
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <Step4
            offerId={createdOfferId}
            onViewOffer={() => navigate(`/offers/${createdOfferId}`)}
            onBackToDashboard={() => navigate('/offers')}
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
  customPrices: Record<number, number>;
  onCustomPriceChange: (leagueId: number, price: number) => void;
  onBack: () => void;
}

function Step3({
  selectedAssociation,
  selectedSeason,
  selectedLeagues,
  customPrices,
  onCustomPriceChange,
  onNext,
  onBack,
  isLoading,
}: Step3Props) {
  const totalPrice = selectedLeagues.reduce((sum, league) => {
    return sum + (customPrices[league.id] || 0);
  }, 0);

  return (
    <>
      <h2 style={{ margin: '0 0 1.5rem 0' }}>Review & Customize Prices</h2>

      <div style={{
        background: '#f8f9fa',
        padding: '1rem',
        borderRadius: 4,
        marginBottom: '1.5rem',
      }}>
        <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: 12 }}>
          <strong>Association:</strong> {selectedAssociation?.name}
        </p>
        <p style={{ margin: '0', color: '#666', fontSize: 12 }}>
          <strong>Season:</strong> {selectedSeason}
        </p>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          background: '#fff',
          marginBottom: '1rem',
        }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #dee2e6', background: '#f8f9fa' }}>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: 12, fontWeight: 600 }}>League</th>
              <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: 12, fontWeight: 600 }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {selectedLeagues.map((league: any) => (
              <tr key={league.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                <td style={{ padding: '0.75rem' }}>{league.name}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={customPrices[league.id] || ''}
                    onChange={(e) => onCustomPriceChange(league.id, Number(e.target.value))}
                    disabled={isLoading}
                    style={{
                      width: '100px',
                      padding: '0.4rem',
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      boxSizing: 'border-box',
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{
          padding: '1rem',
          background: '#e7f3ff',
          borderRadius: 4,
          textAlign: 'right',
        }}>
          <strong style={{ fontSize: 14 }}>Total: ${totalPrice.toFixed(2)}</strong>
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

interface Step4Props {
  offerId: string;
  onViewOffer: () => void;
  onBackToDashboard: () => void;
}

function Step4({ offerId, onViewOffer, onBackToDashboard }: Step4Props) {
  return (
    <>
      <h2 style={{ margin: '0 0 1.5rem 0' }}>Offer Created!</h2>

      <div style={{
        background: '#d1e7dd',
        border: '1px solid #badbcc',
        borderRadius: 4,
        padding: '1rem',
        marginBottom: '1.5rem',
        color: '#0f5132',
      }}>
        <p style={{ margin: 0, fontSize: 14 }}>
          Your offer has been created successfully. You can now customize prices, review details, or send it to the association.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button
          onClick={onViewOffer}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#0d6efd',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          View Offer Details
        </button>
        <button
          onClick={onBackToDashboard}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Back to Offers Dashboard
        </button>
      </div>
    </>
  );
}
