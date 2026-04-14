// src/client/hooks/__tests__/useExtraction.test.ts

import { describe, it, expect } from 'vitest';
import { extractContactInfo } from '../useExtraction';

describe('extractContactInfo', () => {
  it('should extract organization name', () => {
    const text = `AFCV NRW e.V.
Fabian Pawlowski
Halterner Straße 193
45770 Marl
f.pawlowski@afcvnrw.de`;

    const result = extractContactInfo(text);

    expect(result.organizationName).toBe('AFCV NRW e.V.');
  });

  it('should extract email', () => {
    const text = `Organization
Contact
Address
f.pawlowski@example.com`;

    const result = extractContactInfo(text);

    expect(result.email).toBe('f.pawlowski@example.com');
  });

  it('should extract postal code and city', () => {
    const text = `Org
Contact
Street
45770 Marl
Email`;

    const result = extractContactInfo(text);

    expect(result.postalCode).toBe('45770');
    expect(result.city).toBe('Marl');
  });

  it('should extract phone number', () => {
    const text = `Org
Contact
+49 123 456789
Email`;

    const result = extractContactInfo(text);

    expect(result.phone).toBe('+49 123 456789');
  });

  it('should handle partial extraction', () => {
    const text = `AFCV NRW
Fabian`;

    const result = extractContactInfo(text);

    expect(result.organizationName).toBe('AFCV NRW');
    expect(result.contactName).toBe('Fabian');
  });
});
