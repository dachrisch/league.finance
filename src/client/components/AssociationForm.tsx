import { useState } from 'react';

export interface AssociationFormProps {
  onSubmit: (data: { name: string; description: string; email: string; phone: string }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: { name: string; description: string; email: string; phone: string };
}

export function AssociationForm({ onSubmit, onCancel, isLoading = false, initialData }: AssociationFormProps) {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    description: '',
    email: '',
    phone: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Association name is required');
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err?.message || 'Failed to create association');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && (
        <div style={{ color: '#dc3545', fontSize: '0.875rem', padding: '0.5rem' }}>
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
          Association Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Northern Region Leagues"
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="description" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Optional details about this association"
          rows={2}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
          }}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="email" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
          Email *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="contact@association.local"
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}
          disabled={isLoading}
        />
      </div>

      <div>
        <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
          Phone
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="+1 555-0123"
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '0.875rem',
          }}
          disabled={isLoading}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        {onCancel && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary btn-sm" disabled={isLoading}>
          {isLoading ? (initialData ? 'Updating...' : 'Creating...') : (initialData ? 'Update Association' : 'Create Association')}
        </button>
      </div>
    </form>
  );
}
