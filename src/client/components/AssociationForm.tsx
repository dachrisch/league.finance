import { useState } from 'react';
import type { AssociationInput } from '../lib/schemas';

export interface AssociationFormProps {
  onSubmit: (data: AssociationInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  initialData?: AssociationInput;
}

export function AssociationForm({ onSubmit, onCancel, isLoading = false, initialData }: AssociationFormProps) {
  const [formData, setFormData] = useState<AssociationInput>(initialData || {
    name: '',
    address: {
      street: '',
      city: '',
      postalCode: '',
      country: 'Germany',
    },
  });
  const [error, setError] = useState('');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, name: e.target.value }));
  };

  const handleAddressChange = (field: keyof AssociationInput['address'], value: string) => {
    setFormData((prev) => ({
      ...prev,
      address: {
        ...prev.address,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Association name is required');
      return;
    }

    if (!formData.address.street.trim() || !formData.address.city.trim() || !formData.address.postalCode.trim()) {
      setError('Complete address is required');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (err: any) {
      setError(err?.message || 'Failed to save association');
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
          value={formData.name}
          onChange={handleNameChange}
          placeholder="e.g., AFCV NRW e.V."
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
          value={formData.address.street}
          onChange={(e) => handleAddressChange('street', e.target.value)}
          placeholder="Street and house number"
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
          <label htmlFor="postalCode" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
            Postal Code *
          </label>
          <input
            type="text"
            id="postalCode"
            value={formData.address.postalCode}
            onChange={(e) => handleAddressChange('postalCode', e.target.value)}
            placeholder="12345"
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
          <label htmlFor="city" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
            City *
          </label>
          <input
            type="text"
            id="city"
            value={formData.address.city}
            onChange={(e) => handleAddressChange('city', e.target.value)}
            placeholder="City"
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
          value={formData.address.country}
          onChange={(e) => handleAddressChange('country', e.target.value)}
          placeholder="Country"
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
