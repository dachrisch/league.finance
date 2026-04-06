import { z } from 'zod';
import { UserSchema, UserRoleSchema, JwtPayloadSchema } from '../schemas/user';
import { LeagueSchema, SeasonSchema, TeamSchema } from '../schemas/teams';
import { FinancialSettingsSchema, UpdateFinancialSettingsSchema } from '../schemas/financialSettings';
import { FinancialConfigSchema, CostModelSchema, CreateFinancialConfigSchema, UpdateFinancialConfigSchema } from '../schemas/financialConfig';
import { DiscountSchema, DiscountTypeSchema, AddDiscountSchema } from '../schemas/discount';

export type User = z.infer<typeof UserSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

export type League = z.infer<typeof LeagueSchema>;
export type Season = z.infer<typeof SeasonSchema>;
export type Team = z.infer<typeof TeamSchema>;

export type FinancialSettings = z.infer<typeof FinancialSettingsSchema>;
export type UpdateFinancialSettingsInput = z.infer<typeof UpdateFinancialSettingsSchema>;

export type CostModel = z.infer<typeof CostModelSchema>;
export type FinancialConfig = z.infer<typeof FinancialConfigSchema>;
export type CreateFinancialConfigInput = z.infer<typeof CreateFinancialConfigSchema>;
export type UpdateFinancialConfigInput = z.infer<typeof UpdateFinancialConfigSchema>;

export type DiscountType = z.infer<typeof DiscountTypeSchema>;
export type Discount = z.infer<typeof DiscountSchema>;
export type AddDiscountInput = z.infer<typeof AddDiscountSchema>;
