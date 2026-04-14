import { useState } from 'react';
import { AssociationContactForm } from './AssociationContactForm';

export interface OfferWizardStep1Props {
  onContinue: (data: {
    associationId: string;
    contactId: string;
    seasonId: number;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
  // Data props - required for rendering
  associations: Array<{ _id: string; name: string }>;
  contacts: Array<{ _id: string; name: string }>;
  seasons: Array<{ id: number; name: string }>;
}

interface ValidationErrors {
  associationContact?: string;
  season?: string;
}

export function OfferWizardStep1({
  onContinue,
  onCancel,
  isLoading = false,
  associations,
  contacts,
  seasons,
}: OfferWizardStep1Props) {
  const [extractedData, setExtractedData] = useState<{
    association?: { name: string };
    contact?: { name: string; email: string };
  } | null>(null);

  const [selectedAssociationId, setSelectedAssociationId] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedSeasonId, setSelectedSeasonId] = useState(0);

  const [errors, setErrors] = useState<ValidationErrors>({});

  const handleExtractedData = async (data: any) => {
    setExtractedData({
      association: { name: data.association.name },
      contact: { name: data.contact.name, email: data.contact.email },
    });
    // TODO: Handle duplicate detection and creation
  };

  const handleContinue = () => {
    const newErrors: ValidationErrors = {};

    // Validate: either extracted data or dropdown selections
    const hasExtracted = extractedData?.association && extractedData?.contact;
    const hasDropdownSelections = selectedAssociationId && selectedContactId;

    if (!hasExtracted && !hasDropdownSelections) {
      newErrors.associationContact = 'Please extract association and contact info or select from existing records';
    }

    if (!selectedSeasonId) {
      newErrors.season = 'Season is required';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    // For now, use dropdown selections (will be enhanced in Task 4)
    const associationId = selectedAssociationId || ''; // Will use extracted ID after Task 4
    const contactId = selectedContactId || ''; // Will use extracted ID after Task 4

    onContinue({
      associationId,
      contactId,
      seasonId: selectedSeasonId,
    });
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Step 1: Association, Contact & Season</h2>

      {/* Extract Option */}
      <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3 style={{ marginBottom: '1rem' }}>Extract from Text (Optional)</h3>
        <AssociationContactForm
          onSubmit={handleExtractedData}
          onCancel={() => setExtractedData(null)}
          isLoading={isLoading}
        />
      </div>

      {/* OR Separator */}
      <div style={{ textAlign: 'center', margin: '2rem 0', color: '#999' }}>
        ──── OR USE EXISTING ────
      </div>

      {/* Dropdown Option */}
      <div style={{ marginBottom: '1.5rem' }}>
        {errors.associationContact && (
          <div style={{ color: '#dc3545', fontSize: '0.875rem', marginBottom: '1rem', padding: '0.5rem' }}>
            {errors.associationContact}
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Association *
          </label>
          <select
            value={selectedAssociationId}
            onChange={(e) => setSelectedAssociationId(e.target.value)}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
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
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Contact *
          </label>
          <select
            value={selectedContactId}
            onChange={(e) => setSelectedContactId(e.target.value)}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
            }}
          >
            <option value="">-- Select Contact --</option>
            {(contacts || []).map((c: any) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Season *
          </label>
          <select
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(parseInt(e.target.value))}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: errors.season ? '2px solid #dc3545' : '1px solid #dee2e6',
              borderRadius: '4px',
            }}
          >
            <option value={0}>-- Select Season --</option>
            {(seasons || []).map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {errors.season && (
            <div style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {errors.season}
            </div>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn-outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleContinue}
          disabled={isLoading}
        >
          Next: Pricing & Leagues
        </button>
      </div>
    </div>
  );
}
