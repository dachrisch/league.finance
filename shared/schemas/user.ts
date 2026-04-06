import { z } from 'zod';

export const UserRoleSchema = z.enum(['admin', 'viewer']);

export const UserSchema = z.object({
  _id: z.string(),
  email: z.string().email(),
  googleId: z.string(),
  displayName: z.string(),
  role: UserRoleSchema,
  createdAt: z.date(),
});

export const JwtPayloadSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
});
