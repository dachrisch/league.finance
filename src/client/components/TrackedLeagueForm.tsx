import { useState, useEffect } from 'react';

const STATUS_OPTIONS = [
  { value: 'lead', label: 'Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'offer_in_progress', label: 'Offer in progress' },
  { value: 'rejected_pre_offer', label: 'Rejected (before offer)' },
  { value: 'closed_historical', label: 'Closed (historical)' },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid #dee2e6',
  borderRadius: '4px',
  fontSize: '0.875rem',
};

export interface TrackedLeagueFormProps {
  initialData?: any;
  associationId: string;
  contacts: { _id: string; name: string }[];
  onSubmit: (data: {
    associationId: string;
    contactId: string | null;
    name: string;
    year: number;
    isYouth: boolean;
    estimatedTeamsCount: string | null;
    estimatedGamedaysCount: string | null;
    comment: string;
    status: string;
  }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function TrackedLeagueForm({ initialData, associationId, contacts, onSubmit, onCancel, isLoading = false }: TrackedLeagueFormProps) {
  const [formData, setFormData] = useState({
    contactId: '',
    name: '',
    year: new Date().getFullYear(),
    isYouth: false,
    estimatedTeamsCount: '',
    estimatedGamedaysCount: '',
    comment: '',
    status: 'lead',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        contactId: initialData.contactId || '',
        name: initialData.name || '',
        year: initialData.year || new Date().getFullYear(),
        isYouth: !!initialData.isYouth,
        estimatedTeamsCount: initialData.estimatedTeamsCount || '',
        estimatedGamedaysCount: initialData.estimatedGamedaysCount || '',
        comment: initialData.comment || '',
        status: initialData.status || 'lead',
      });
    }
  }, [initialData]);

  const isLinked = !!initialData?.linkedOfferId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('League name is required');
      return;
    }
    if (!formData.year || formData.year < 2000) {
      setError('A valid year is required');
      return;
    }

    try {
      await onSubmit({
        associationId,
        contactId: formData.contactId || null,
        name: formData.name,
        year: Number(formData.year),
        isYouth: formData.isYouth,
        estimatedTeamsCount: formData.estimatedTeamsCount || null,
        estimatedGamedaysCount: formData.estimatedGamedaysCount || null,
        comment: formData.comment,
        status: formData.status,
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to save tracked league');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && <div style={{ color: '#dc3545', fontSize: '0.875rem' }}>{error}</div>}

      <div>
        <label htmlFor="tl-name" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>League Name *</label>
        <input
          id="tl-name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
          placeholder="Regionalliga Hessen"
          style={inputStyle}
          disabled={isLoading}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label htmlFor="tl-year" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Year *</label>
          <input
            id="tl-year"
            type="number"
            value={formData.year}
            onChange={(e) => setFormData((p) => ({ ...p, year: Number(e.target.value) }))}
            style={inputStyle}
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="tl-contact" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Contact</label>
          <select
            id="tl-contact"
            value={formData.contactId}
            onChange={(e) => setFormData((p) => ({ ...p, contactId: e.target.value }))}
            style={inputStyle}
            disabled={isLoading}
          >
            <option value="">— None —</option>
            {contacts.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
        <input
          type="checkbox"
          checked={formData.isYouth}
          onChange={(e) => setFormData((p) => ({ ...p, isYouth: e.target.checked }))}
          disabled={isLoading}
        />
        Youth league
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label htmlFor="tl-teams" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Est. Teams</label>
          <input
            id="tl-teams"
            type="text"
            value={formData.estimatedTeamsCount}
            onChange={(e) => setFormData((p) => ({ ...p, estimatedTeamsCount: e.target.value }))}
            placeholder="~50"
            style={inputStyle}
            disabled={isLoading}
          />
        </div>
        <div>
          <label htmlFor="tl-gamedays" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Est. Gamedays</label>
          <input
            id="tl-gamedays"
            type="text"
            value={formData.estimatedGamedaysCount}
            onChange={(e) => setFormData((p) => ({ ...p, estimatedGamedaysCount: e.target.value }))}
            placeholder="max. 6/Spieltag"
            style={inputStyle}
            disabled={isLoading}
          />
        </div>
      </div>

      <div>
        <label htmlFor="tl-comment" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Comment</label>
        <textarea
          id="tl-comment"
          value={formData.comment}
          rows={3}
          onChange={(e) => setFormData((p) => ({ ...p, comment: e.target.value }))}
          style={inputStyle}
          disabled={isLoading}
        />
      </div>

      {isLinked ? (
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Status is derived from the linked offer — edit it from the offer page.
        </div>
      ) : (
        <div>
          <label htmlFor="tl-status" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Status</label>
          <select
            id="tl-status"
            value={formData.status}
            onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
            style={inputStyle}
            disabled={isLoading}
          >
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        {onCancel && (
          <button type="button" className="btn btn-outline btn-sm" onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary btn-sm" disabled={isLoading}>
          {isLoading ? 'Saving...' : initialData ? 'Update League' : 'Add League'}
        </button>
      </div>
    </form>
  );
}
