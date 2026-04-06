import { z } from 'zod';

export const LeagueSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});

export const SeasonSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});

export const TeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  location: z.string(),
});
