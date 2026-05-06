import { useState } from 'react';
import { extractContactInfo } from '../hooks/useExtraction';
import { trpc } from '../lib/trpc';

export interface AssociationContactFormProps {
  onSubmit: (data: {
    association: { name: string; address: { street: string; city: string; postalCode: string; country: string } };
    contact: { name: string; email: string; phone?: string };
    createdEntities: { associationId?: string; contactId?: string };
  }) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

interface FormData {
  associationName: string;
  contactName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export function AssociationContactForm({ onSubmit, onCancel, isLoading = false }: AssociationContactFormProps) {
  const [pastedText, setPastedText] = useState('');
  const [extractedData, setExtractedData] = useState<{ confidence: 'high' | 'medium' | 'low' } | null>(null);
  const [formData, setFormData] = useState<FormData>({
    associationName: '',
    contactName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    postalCode: '',
    country: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingAssociation, setExistingAssociation] = useState<{ _id: string; name: string } | null>(null);
  const [existingContact, setExistingContact] = useState<{ _id: string; name: string } | null>(null);

  const utils = trpc.useUtils();

  const handleAutoFill = async () => {
    setError('');
    setExistingAssociation(null);
    setExistingContact(null);

    if (!pastedText.trim()) {
      setError('Please paste some text to extract');
      return;
    }

    const extracted = extractContactInfo(pastedText);

    // Determine confidence level based on available data
    const requiredFields = ['organizationName', 'contactName', 'email', 'city', 'postalCode'];
    const missing = requiredFields.filter((field) => !extracted[field as keyof typeof extracted]);

    let confidence: 'high' | 'medium' | 'low' = 'high';
    if (missing.length === 0) {
      confidence = 'high';
    } else if (missing.length <= 2) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    setExtractedData({ confidence });

    // Populate form data from extraction
    const newFormData = {
      associationName: extracted.organizationName || '',
      contactName: extracted.contactName || '',
      email: extracted.email || '',
      phone: extracted.phone || '',
      street: extracted.street || '',
      city: extracted.city || '',
      postalCode: extracted.postalCode || '',
      country: extracted.country || 'Germany',
    };
    setFormData(newFormData);

    // Check for duplicates
    if (newFormData.associationName) {
      try {
        const assoc = await utils.finance.associations.search.fetch({ name: newFormData.associationName });
        if (assoc) setExistingAssociation(assoc);
      } catch (err) {
        console.error('Error searching association:', err);
      }
    }

    if (newFormData.email || (newFormData.contactName && newFormData.city)) {
      try {
        const contact = await utils.finance.contacts.search.fetch({
          email: newFormData.email,
          name: newFormData.contactName,
          city: newFormData.city
        });
        if (contact) setExistingContact(contact);
      } catch (err) {
        console.error('Error searching contact:', err);
      }
    }
  };

  const handleFieldChange = async (field: keyof FormData, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      return next;
    });

    // Re-check duplicates on specific field changes
    if (field === 'associationName') {
      const assoc = await utils.finance.associations.search.fetch({ name: value });
      setExistingAssociation(assoc || null);
    } else if (field === 'email' || field === 'contactName' || field === 'city') {
      const contact = await utils.finance.contacts.search.fetch({
        email: field === 'email' ? value : formData.email,
        name: field === 'contactName' ? value : formData.contactName,
        city: field === 'city' ? value : formData.city
      });
      setExistingContact(contact || null);
    }
  };

  const isFieldDisabled = (field: string): boolean => {
    if (!extractedData) return false;
    // If it's an existing association, disable its fields
    if (existingAssociation && ['associationName', 'street', 'city', 'postalCode', 'country'].includes(field)) {
      return true;
    }
    // If it's an existing contact, disable its fields
    if (existingContact && ['contactName', 'email', 'phone'].includes(field)) {
      return true;
    }

    if (extractedData.confidence !== 'high') return false;
    // Email is always editable
    if (field === 'email') return false;
    // Phone is always editable
    if (field === 'phone') return false;
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!formData.associationName.trim()) {
      setError('Association name is required');
      return;
    }

    if (!formData.contactName.trim()) {
      setError('Contact name is required');
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    if (!formData.street.trim()) {
      setError('Street is required');
      return;
    }

    if (!formData.city.trim()) {
      setError('City is required');
      return;
    }

    if (!formData.postalCode.trim()) {
      setError('Postal code is required');
      return;
    }

    if (!formData.country.trim()) {
      setError('Country is required');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        association: {
          name: formData.associationName,
          address: {
            street: formData.street,
            city: formData.city,
            postalCode: formData.postalCode,
            country: formData.country,
          },
        },
        contact: {
          name: formData.contactName,
          email: formData.email,
          phone: formData.phone || undefined,
        },
        createdEntities: {
          associationId: existingAssociation?._id,
          contactId: existingContact?._id,
        },
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to create association and contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showExtractedFields = extractedData !== null;
  const confidence = extractedData?.confidence;
  const isHighConfidence = confidence === 'high';
  const isLowConfidence = confidence === 'low';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Textarea Section - Always visible */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label htmlFor="pastedText" style={{ fontWeight: '500' }}>
          Paste Organization & Contact Information
        </label>
        <textarea
          id="pastedText"
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder="Paste text with organization name, contact info, and address..."
          rows={6}
          style={{
            width: '100%',
            padding: '0.75rem',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '0.875rem',
            fontFamily: 'monospace',
            resize: 'vertical',
          }}
          disabled={isSubmitting || isLoading}
        />
        <button
          type="button"
          onClick={handleAutoFill}
          className="btn btn-secondary"
          disabled={isSubmitting || isLoading}
          style={{ alignSelf: 'flex-start' }}
        >
          Auto-Fill
        </button>
      </div>

      {/* Extracted Fields Section */}
      {showExtractedFields && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Duplicate Warnings */}
          {existingAssociation && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#e3f2fd',
                color: '#0d47a1',
                border: '1px solid #bbdefb',
                borderRadius: '4px',
                fontSize: '0.875rem',
              }}
            >
              ℹ️ Organization "<strong>{existingAssociation.name}</strong>" already exists. It will be reused.
            </div>
          )}

          {existingContact && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#e3f2fd',
                color: '#0d47a1',
                border: '1px solid #bbdefb',
                borderRadius: '4px',
                fontSize: '0.875rem',
              }}
            >
              ℹ️ Contact "<strong>{existingContact.name}</strong>" already exists. It will be reused.
            </div>
          )}

          {/* Confidence Banner */}
          {!existingAssociation && !existingContact && isHighConfidence && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#d4edda',
                color: '#155724',
                border: '1px solid #c3e6cb',
                borderRadius: '4px',
                fontSize: '0.875rem',
              }}
            >
              ✓ High confidence extraction - fields are read-only. You can still edit email and phone.
            </div>
          )}

          {isLowConfidence && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#fff3cd',
                color: '#856404',
                border: '1px solid #ffeaa7',
                borderRadius: '4px',
                fontSize: '0.875rem',
              }}
            >
              Please review the extracted information carefully. Some fields may need correction.
            </div>
          )}

          {error && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: '#f8d7da',
                color: '#721c24',
                border: '1px solid #f5c6cb',
                borderRadius: '4px',
                fontSize: '0.875rem',
              }}
            >
              {error}
            </div>
          )}


          {/* Organization Section */}
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              Organization
            </legend>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="associationName" style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                Name *
              </label>
              <input
                type="text"
                id="associationName"
                value={formData.associationName}
                onChange={(e) => handleFieldChange('associationName', e.target.value)}
                placeholder="Organization name"
                disabled={isFieldDisabled('associationName') || isSubmitting || isLoading}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  backgroundColor: isFieldDisabled('associationName') ? '#e9ecef' : '#fff',
                }}
              />
            </div>
          </fieldset>

          {/* Address Section */}
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              Address
            </legend>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label htmlFor="street" style={{ fontSize: '0.875rem', fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>
                  Street *
                </label>
                <input
                  type="text"
                  id="street"
                  value={formData.street}
                  onChange={(e) => handleFieldChange('street', e.target.value)}
                  placeholder="Street address"
                  disabled={isFieldDisabled('street') || isSubmitting || isLoading}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    backgroundColor: isFieldDisabled('street') ? '#e9ecef' : '#fff',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label htmlFor="city" style={{ fontSize: '0.875rem', fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>
                    City *
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    placeholder="City"
                    disabled={isFieldDisabled('city') || isSubmitting || isLoading}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      backgroundColor: isFieldDisabled('city') ? '#e9ecef' : '#fff',
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="postalCode" style={{ fontSize: '0.875rem', fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) => handleFieldChange('postalCode', e.target.value)}
                    placeholder="12345"
                    disabled={isFieldDisabled('postalCode') || isSubmitting || isLoading}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      backgroundColor: isFieldDisabled('postalCode') ? '#e9ecef' : '#fff',
                    }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="country" style={{ fontSize: '0.875rem', fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>
                  Country *
                </label>
                <input
                  type="text"
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleFieldChange('country', e.target.value)}
                  placeholder="Country"
                  disabled={isFieldDisabled('country') || isSubmitting || isLoading}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    backgroundColor: isFieldDisabled('country') ? '#e9ecef' : '#fff',
                  }}
                />
              </div>
            </div>
          </fieldset>

          {/* Contact Section */}
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              Contact Information
            </legend>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label htmlFor="contactName" style={{ fontSize: '0.875rem', fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>
                  Contact Name *
                </label>
                <input
                  type="text"
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => handleFieldChange('contactName', e.target.value)}
                  placeholder="Full name"
                  disabled={isFieldDisabled('contactName') || isSubmitting || isLoading}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    backgroundColor: isFieldDisabled('contactName') ? '#e9ecef' : '#fff',
                  }}
                />
              </div>

              <div>
                <label htmlFor="email" style={{ fontSize: '0.875rem', fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  placeholder="email@example.com"
                  disabled={isSubmitting || isLoading}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    backgroundColor: '#fff',
                  }}
                />
              </div>

              <div>
                <label htmlFor="phone" style={{ fontSize: '0.875rem', fontWeight: '500', display: 'block', marginBottom: '0.25rem' }}>
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  placeholder="+49 123 456789"
                  disabled={isSubmitting || isLoading}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    backgroundColor: '#fff',
                  }}
                />
              </div>
            </div>
          </fieldset>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            {onCancel && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={onCancel}
                disabled={isSubmitting || isLoading}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting || isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
