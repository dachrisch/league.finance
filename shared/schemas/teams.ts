import { z } from 'zod';

export const SeasonSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});

export const TeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().default(''),
  location: z.string(),
});

export const LeaguesphereAssociationSchema = z.object({
  id: z.number(),
  abbr: z.string(),
  name: z.string(),
});
