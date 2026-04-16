import { useState, useEffect } from 'react';

export interface ContactFormProps {
  initialData?: any;
  onSubmit: (data: {
    name: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
  }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ContactForm({ initialData, onSubmit, onCancel, isLoading = false }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    street: '',
    city: '',
    postalCode: '',
    country: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        street: initialData.address?.street || initialData.street || '',
        city: initialData.address?.city || initialData.city || '',
        postalCode: initialData.address?.postalCode || initialData.postalCode || '',
        country: initialData.address?.country || initialData.country || '',
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Contact name is required');
      return;
    }

    if (!formData.street.trim() || !formData.city.trim() || !formData.postalCode.trim()) {
      setError('Address is required');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err?.message || 'Failed to save contact');
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
          Contact Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="John Doe"
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
        <label htmlFor="street" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
          Street *
        </label>
        <input
          type="text"
          id="street"
          name="street"
          value={formData.street}
          onChange={handleChange}
          placeholder="123 Main St"
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label htmlFor="city" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
            City *
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="New York"
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
          <label htmlFor="postalCode" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
            Postal Code *
          </label>
          <input
            type="text"
            id="postalCode"
            name="postalCode"
            value={formData.postalCode}
            onChange={handleChange}
            placeholder="10001"
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
      </div>

      <div>
        <label htmlFor="country" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
          Country *
        </label>
        <input
          type="text"
          id="country"
          name="country"
          value={formData.country}
          onChange={handleChange}
          placeholder="United States"
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
          {isLoading ? 'Saving...' : initialData ? 'Update Person' : 'Create Person'}
        </button>
      </div>
    </form>
  );
}
