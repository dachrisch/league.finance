import { describe, it, expect } from 'vitest';
import { CreateContactSchema } from '../contact';

const validContact = () => ({
  name: 'Michael Hanke',
  email: 'michael@afvh.de',
  address: { street: 'Street 1', city: 'City', postalCode: '12345', country: 'Germany' },
});

describe('CreateContactSchema', () => {
  it('accepts a contact without an associationId', () => {
    const result = CreateContactSchema.safeParse(validContact());
    expect(result.success).toBe(true);
  });

  it('accepts a contact with an associationId', () => {
    const result = CreateContactSchema.safeParse({ ...validContact(), associationId: '507f1f77bcf86cd799439011' });
    expect(result.success).toBe(true);
    expect(result.data?.associationId).toBe('507f1f77bcf86cd799439011');
  });

  it('accepts an explicit null associationId', () => {
    const result = CreateContactSchema.safeParse({ ...validContact(), associationId: null });
    expect(result.success).toBe(true);
  });
});
