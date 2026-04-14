import { describe, it, expect } from 'vitest';
import {
  ExtractTextSchema,
  ExtractedDataSchema,
  Step1SubmissionSchema,
  Step2SubmissionSchema,
} from '../offerWizard';

describe('Offer Wizard Schemas', () => {
  describe('ExtractTextSchema', () => {
    it('should accept valid extraction text', () => {
      const result = ExtractTextSchema.safeParse({
        text: 'AFCV NRW e.V.\nFabian Pawlowski\nf.pawlowski@example.de',
      });
      expect(result.success).toBe(true);
    });

    it('should reject text shorter than 10 characters', () => {
      const result = ExtractTextSchema.safeParse({
        text: 'short',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ExtractedDataSchema', () => {
    it('should accept valid extracted data', () => {
      const result = ExtractedDataSchema.safeParse({
        organizationName: 'AFCV NRW e.V.',
        street: 'Halterner Straße 193',
        city: 'Marl',
        postalCode: '45770',
        country: 'Germany',
        contactName: 'Fabian Pawlowski',
        email: 'f.pawlowski@example.de',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = ExtractedDataSchema.safeParse({
        organizationName: 'AFCV NRW e.V.',
        street: 'Street',
        city: 'City',
        postalCode: '12345',
        country: 'Country',
        contactName: 'Name',
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Step2SubmissionSchema', () => {
    it('should require at least one league', () => {
      const result = Step2SubmissionSchema.safeParse({
        costModel: 'flatFee',
        expectedTeamsCount: 5,
        leagueIds: [],
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid step 2 submission', () => {
      const result = Step2SubmissionSchema.safeParse({
        costModel: 'perGameDay',
        baseRateOverride: 75,
        expectedTeamsCount: 5,
        leagueIds: ['league1', 'league2'],
      });
      expect(result.success).toBe(true);
    });
  });
});
