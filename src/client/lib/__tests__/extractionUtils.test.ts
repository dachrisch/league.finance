import { describe, it, expect } from 'vitest';
import { parseContactAssociationText } from '../extractionUtils';

describe('parseContactAssociationText', () => {
  describe('high confidence parsing', () => {
    it('extracts organization, contact, and full address', () => {
      const text = `American Football und Cheerleading Verband Nordrhein-Westfalen e.V.
Fabian Pawlowski
Halterner Straße 193
45770 Marl
Germany`;

      const result = parseContactAssociationText(text);

      expect(result.confidence).toBe('high');
      expect(result.association.name).toBe('American Football und Cheerleading Verband Nordrhein-Westfalen e.V.');
      expect(result.contact.name).toBe('Fabian Pawlowski');
      expect(result.contact.address.street).toBe('Halterner Straße 193');
      expect(result.contact.address.city).toBe('Marl');
      expect(result.contact.address.postalCode).toBe('45770');
      expect(result.contact.address.country).toBe('Germany');
    });

    it('extracts email and phone when present', () => {
      const text = `Sports League Association
John Smith
john@example.com
+49 123 456789
123 Main Street
10001 New York
United States`;

      const result = parseContactAssociationText(text);

      expect(result.contact.email).toBe('john@example.com');
      expect(result.contact.phone).toBe('+49 123 456789');
    });

    it('handles German address format with postal code + city on same line', () => {
      const text = `Verband Name
Max Mustermann
Straße 1
12345 Berlin
Germany`;

      const result = parseContactAssociationText(text);

      expect(result.contact.address.postalCode).toBe('12345');
      expect(result.contact.address.city).toBe('Berlin');
    });
  });

  describe('low confidence parsing', () => {
    it('marks as ambiguous when address is incomplete', () => {
      const text = `Organization Name
Person Name
Street Address`;

      const result = parseContactAssociationText(text);

      expect(result.confidence).toBe('low');
      expect(result.contact.address.city).toBe('');
      expect(result.contact.address.postalCode).toBe('');
    });

    it('flags generic emails as suspicious', () => {
      const text = `Company
John Smith
contact@example.com
Street
12345 City
Country`;

      const result = parseContactAssociationText(text);

      expect(result.confidence).toBe('medium');
      expect(result.warnings).toContain('generic-email');
    });
  });

  describe('edge cases', () => {
    it('handles empty or whitespace-only input', () => {
      const result = parseContactAssociationText('   ');
      expect(result.confidence).toBe('low');
      expect(result.association.name).toBe('');
    });

    it('handles text with extra whitespace between fields', () => {
      const text = `Organization

Contact Name

123 Street

12345 City

Country`;

      const result = parseContactAssociationText(text);

      expect(result.contact.name).toBe('Contact Name');
      expect(result.contact.address.street).toBe('123 Street');
    });

    it('detects postal code correctly (5 digits)', () => {
      const text = `Org
Name
Street
45770 Marl
Germany`;

      const result = parseContactAssociationText(text);

      expect(result.contact.address.postalCode).toBe('45770');
    });
  });
});
