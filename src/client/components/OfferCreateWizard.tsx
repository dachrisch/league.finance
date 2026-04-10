// src/client/components/OfferCreateWizard.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { trpc } from '../lib/trpc';
import { AssociationForm } from './AssociationForm';
import { ContactForm } from './ContactForm';
import { ContactGrid } from './ContactGrid';

type WizardStep = 1 | 2 | 3;

interface WizardState {
  associationId: string;
  seasonId: number;
  contactId: string;
  costModel: 'SEASON' | 'GAMEDAY';
  baseRateOverride: number | null;
  expectedTeamsCount: number;
  selectedLeagueIds: number[];
}

export function OfferCreateWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>(1);
  const [state, setState] = useState<WizardState>({
    associationId: '',
    seasonId: 0,
    contactId: '',
    costModel: 'SEASON',
    baseRateOverride: null,
    expectedTeamsCount: 0,
    selectedLeagueIds: [],
  });

  const [showNewAssociation, setShowNewAssociation] = useState(false);
  const [showNewContact, setShowNewContact] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // TRPC queries & mutations
  const { data: associations, isLoading: loadingAssociations } = trpc.finance.associations.list.useQuery();
  const { data: contacts, refetch: refetchContacts } = trpc.finance.contacts.list.useQuery();
  const { data: seasons, isLoading: loadingSeasons } = trpc.teams.seasons.useQuery();
  const { data: leagues, isLoading: loadingLeagues } = trpc.teams.leagues.useQuery();

  const createAssociation = trpc.finance.associations.create.useMutation();
  const createContact = trpc.finance.contacts.create.useMutation();
  const createOffer = trpc.finance.offers.create.useMutation();

  // Step 1: Association & Season
  const handleAssociationCreated = async (data: any) => {
    setIsLoading(true);
    try {
      const result = await createAssociation.mutateAsync(data);
      setState((prev) => ({ ...prev, associationId: result._id }));
      setShowNewAssociation(false);
    } catch (err) {
      console.error('Failed to create association:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep1Continue = () => {
    if (!state.associationId || !state.seasonId) {
      alert('Please select an association and season');
      return;
    }
    setStep(2);
  };

  // Step 2: Contact
  const handleContactCreated = async (data: any) => {
    setIsLoading(true);
    try {
      const result = await createContact.mutateAsync(data);
      setState((prev) => ({ ...prev, contactId: result._id }));
      await refetchContacts();
      setShowNewContact(false);
    } catch (err) {
      console.error('Failed to create contact:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep2Continue = () => {
    if (!state.contactId) {
      alert('Please select a contact');
      return;
    }
    setStep(3);
  };

  // Step 3: Pricing & Leagues
  const handleCreateOffer = async () => {
    if (state.selectedLeagueIds.length === 0) {
      alert('Please select at least one league');
      return;
    }

    setIsLoading(true);
    try {
      const result = await createOffer.mutateAsync({
        associationId: state.associationId,
        seasonId: state.seasonId,
        contactId: state.contactId,
        leagueIds: state.selectedLeagueIds,
        costModel: state.costModel,
        baseRateOverride: state.baseRateOverride,
        expectedTeamsCount: state.expectedTeamsCount,
      });
      navigate(`/offers/${result._id}`);
    } catch (err: any) {
      alert(`Failed to create offer: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedAssociation = associations?.find((a: any) => a._id === state.associationId);
  const selectedSeason = seasons?.find((s: any) => s.id === state.seasonId);
  const selectedContact = contacts?.find((c: any) => c._id === state.contactId);
  const selectedLeagueNames = (leagues || [])
    .filter((l: any) => state.selectedLeagueIds.includes(l.id))
    .map((l: any) => l.name);

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Create New Offer</h1>

      {/* Progress Indicator */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            style={{
              flex: 1,
              padding: '0.75rem',
              textAlign: 'center',
              backgroundColor: s <= step ? '#0d6efd' : '#e9ecef',
              color: s <= step ? '#fff' : '#6c757d',
              borderRadius: '4px',
              fontWeight: '500',
            }}
          >
            Step {s}
          </div>
        ))}
      </div>

      {/* STEP 1: Association & Season */}
      {step === 1 && (
        <div>
          <h2 style={{ marginBottom: '1.5rem' }}>Step 1: Select Association & Season</h2>

          {!showNewAssociation ? (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Association *
                </label>
                <select
                  value={state.associationId}
                  onChange={(e) => setState((prev) => ({ ...prev, associationId: e.target.value }))}
                  disabled={isLoading || loadingAssociations}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    fontSize: '1rem',
                  }}
                >
                  <option value="">-- Select Association --</option>
                  {(associations || []).map((a: any) => (
                    <option key={a._id} value={a._id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowNewAssociation(true)}
                  disabled={isLoading}
                >
                  + Create New Association
                </button>
              </div>
            </>
          ) : (
            <div style={{ marginBottom: '1.5rem', padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <h3 style={{ marginBottom: '1rem' }}>Create New Association</h3>
              <AssociationForm
                onSubmit={handleAssociationCreated}
                onCancel={() => setShowNewAssociation(false)}
                isLoading={isLoading}
              />
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Season *
            </label>
            <select
              value={state.seasonId}
              onChange={(e) => setState((prev) => ({ ...prev, seasonId: parseInt(e.target.value) }))}
              disabled={isLoading || loadingSeasons}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            >
              <option value={0}>-- Select Season --</option>
              {(seasons || []).map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => navigate('/offers')}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleStep1Continue}
              disabled={isLoading}
            >
              Next: Select Contact
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Contact */}
      {step === 2 && (
        <div>
          <h2 style={{ marginBottom: '1.5rem' }}>Step 2: Select or Create Contact</h2>

          {!showNewContact ? (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Select Existing Contact</h3>
                <ContactGrid
                  contacts={contacts || []}
                  selectedId={state.contactId}
                  onSelect={(id) => setState((prev) => ({ ...prev, contactId: id }))}
                  isLoading={isLoading}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowNewContact(true)}
                  disabled={isLoading}
                >
                  + Create New Contact
                </button>
              </div>
            </>
          ) : (
            <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Create New Contact</h3>
              <ContactForm
                onSubmit={handleContactCreated}
                onCancel={() => setShowNewContact(false)}
                isLoading={isLoading}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setStep(1)}
              disabled={isLoading}
            >
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleStep2Continue}
              disabled={isLoading}
            >
              Next: Set Pricing & Leagues
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Pricing & Leagues */}
      {step === 3 && (
        <div>
          <h2 style={{ marginBottom: '1.5rem' }}>Step 3: Set Pricing & Select Leagues</h2>

          <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f0f8ff', borderRadius: '8px' }}>
            <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Review Your Selections</h4>
            <div style={{ fontSize: '0.875rem', color: '#495057' }}>
              <div><strong>Association:</strong> {selectedAssociation?.name}</div>
              <div><strong>Season:</strong> {selectedSeason?.name}</div>
              <div><strong>Contact:</strong> {selectedContact?.name}</div>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Cost Model
            </label>
            <select
              value={state.costModel}
              onChange={(e) => setState((prev) => ({ ...prev, costModel: e.target.value as 'SEASON' | 'GAMEDAY' }))}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            >
              <option value="SEASON">Season Flat Fee</option>
              <option value="GAMEDAY">Per Game Day</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Base Rate Override (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={state.baseRateOverride || ''}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  baseRateOverride: e.target.value ? parseFloat(e.target.value) : null,
                }))
              }
              placeholder="Leave empty for default (€50)"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Expected Teams Count
            </label>
            <input
              type="number"
              min="0"
              value={state.expectedTeamsCount}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  expectedTeamsCount: parseInt(e.target.value) || 0,
                }))
              }
              placeholder="0"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '500' }}>
              Select Leagues * ({state.selectedLeagueIds.length} selected)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(leagues || []).map((league: any) => (
                <div key={league.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    id={`league-${league.id}`}
                    checked={state.selectedLeagueIds.includes(league.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setState((prev) => ({
                          ...prev,
                          selectedLeagueIds: [...prev.selectedLeagueIds, league.id],
                        }));
                      } else {
                        setState((prev) => ({
                          ...prev,
                          selectedLeagueIds: prev.selectedLeagueIds.filter((id) => id !== league.id),
                        }));
                      }
                    }}
                    disabled={isLoading}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <label htmlFor={`league-${league.id}`} style={{ cursor: 'pointer', flex: 1 }}>
                    {league.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setStep(2)}
              disabled={isLoading}
            >
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateOffer}
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Offer (Draft)'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
