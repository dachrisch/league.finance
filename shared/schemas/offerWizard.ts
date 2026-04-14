import { z } from 'zod';

export const ExtractTextSchema = z.object({
  text: z.string().min(10, 'Text must be at least 10 characters'),
});

export type ExtractTextInput = z.infer<typeof ExtractTextSchema>;

export const ExtractedDataSchema = z.object({
  organizationName: z.string(),
  street: z.string(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
  contactName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
});

export type ExtractedData = z.infer<typeof ExtractedDataSchema>;

export const DuplicateCheckResponseSchema = z.object({
  associationMatches: z.array(
    z.object({
      _id: z.string(),
      name: z.string(),
      type: z.enum(['exact', 'fuzzy']),
    })
  ),
  contactMatches: z.array(
    z.object({
      _id: z.string(),
      name: z.string(),
      email: z.string(),
      type: z.enum(['exact']),
    })
  ),
});

export type DuplicateCheckResponse = z.infer<typeof DuplicateCheckResponseSchema>;

export const Step1SubmissionSchema = z.object({
  associationId: z.string().min(1, 'Association is required'),
  contactId: z.string().min(1, 'Contact is required'),
  seasonId: z.string().min(1, 'Season is required'),
});

export type Step1Submission = z.infer<typeof Step1SubmissionSchema>;

export const Step2SubmissionSchema = z.object({
  costModel: z.enum(['flatFee', 'perGameDay']),
  baseRateOverride: z.number().positive().optional(),
  expectedTeamsCount: z.number().nonnegative(),
  leagueIds: z.array(z.string()).min(1, 'At least one league is required'),
});

export type Step2Submission = z.infer<typeof Step2SubmissionSchema>;

export const CreateOfferSchema = z.object({
  associationId: z.string(),
  contactId: z.string(),
  seasonId: z.string(),
  costModel: z.enum(['flatFee', 'perGameDay']),
  baseRateOverride: z.number().positive().optional(),
  expectedTeamsCount: z.number().nonnegative(),
  leagueIds: z.array(z.string()).min(1),
});

export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;
