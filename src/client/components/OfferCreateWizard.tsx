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

interface ValidationErrors {
  associationId?: string;
  seasonId?: string;
  contactId?: string;
  selectedLeagueIds?: string;
  baseRateOverride?: string;
  general?: string;
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
  const [errors, setErrors] = useState<ValidationErrors>({});

  // TRPC queries & mutations
  const { data: associations, isLoading: loadingAssociations, refetch: refetchAssociations } = trpc.finance.associations.list.useQuery();
  const { data: contacts, isLoading: loadingContacts, refetch: refetchContacts } = trpc.finance.contacts.list.useQuery();
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
      await refetchAssociations();
      setShowNewAssociation(false);
    } catch (err) {
      console.error('Failed to create association:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep1Continue = () => {
    const newErrors: ValidationErrors = {};
    if (!state.associationId) {
      newErrors.associationId = 'Please select an association';
    }
    if (!state.seasonId) {
      newErrors.seasonId = 'Please select a season';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      setStep(2);
    }
  };

  // Step 2: Contact
  const handleContactCreated = async (data: any) => {
    setIsLoading(true);
    try {
      const result = await createContact.mutateAsync({
        name: data.name,
        address: {
          street: data.street,
          city: data.city,
          postalCode: data.postalCode,
          country: data.country,
        },
      });
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
    const newErrors: ValidationErrors = {};
    if (!state.contactId) {
      newErrors.contactId = 'Please select a contact';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      setStep(3);
    }
  };

  // Step 3: Pricing & Leagues
  const handleCreateOffer = async () => {
    const newErrors: ValidationErrors = {};
    if (state.selectedLeagueIds.length === 0) {
      newErrors.selectedLeagueIds = 'Please select at least one league';
    }

    if (state.baseRateOverride !== null && state.baseRateOverride <= 0) {
      newErrors.baseRateOverride = 'Base rate override must be greater than 0';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
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
      setErrors({
        general: err?.message || 'Failed to create offer',
      });
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
                  Association * {errors.associationId && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>- {errors.associationId}</span>}
                </label>
                <select
                  value={state.associationId}
                  onChange={(e) => {
                    setState((prev) => ({ ...prev, associationId: e.target.value }));
                    setErrors((prev) => ({ ...prev, associationId: undefined }));
                  }}
                  disabled={isLoading || loadingAssociations}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: errors.associationId ? '2px solid #dc3545' : '1px solid #dee2e6',
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
              Season * {errors.seasonId && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>- {errors.seasonId}</span>}
            </label>
            <select
              value={state.seasonId}
              onChange={(e) => {
                setState((prev) => ({ ...prev, seasonId: parseInt(e.target.value) }));
                setErrors((prev) => ({ ...prev, seasonId: undefined }));
              }}
              disabled={isLoading || loadingSeasons}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: errors.seasonId ? '2px solid #dc3545' : '1px solid #dee2e6',
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
                <h3 style={{ marginBottom: '0.5rem' }}>Select Existing Contact {errors.contactId && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>- {errors.contactId}</span>}</h3>
                <ContactGrid
                  contacts={contacts || []}
                  selectedId={state.contactId}
                  onSelect={(id) => {
                    setState((prev) => ({ ...prev, contactId: id }));
                    setErrors((prev) => ({ ...prev, contactId: undefined }));
                  }}
                  isLoading={isLoading || loadingContacts}
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

          {errors.general && (
            <div style={{ marginBottom: '1.5rem', padding: '0.75rem', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '4px', color: '#721c24' }}>
              {errors.general}
            </div>
          )}

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
              Base Rate Override (€) {errors.baseRateOverride && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>- {errors.baseRateOverride}</span>}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={state.baseRateOverride || ''}
              onChange={(e) => {
                setState((prev) => ({
                  ...prev,
                  baseRateOverride: e.target.value ? parseFloat(e.target.value) : null,
                }));
                setErrors((prev) => ({ ...prev, baseRateOverride: undefined }));
              }}
              placeholder="Leave empty for default (€50)"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: errors.baseRateOverride ? '2px solid #dc3545' : '1px solid #dee2e6',
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
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Select Leagues * ({state.selectedLeagueIds.length} selected) {errors.selectedLeagueIds && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>- {errors.selectedLeagueIds}</span>}
            </label>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              padding: '0.75rem',
              border: errors.selectedLeagueIds ? '2px solid #dc3545' : '1px solid #dee2e6',
              borderRadius: '4px'
            }}>
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
                      setErrors((prev) => ({ ...prev, selectedLeagueIds: undefined }));
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
