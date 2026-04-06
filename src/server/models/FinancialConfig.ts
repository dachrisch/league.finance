import { Schema, model, Document } from 'mongoose';

export interface IFinancialConfig extends Document {
  leagueId: number;
  seasonId: number;
  costModel: 'SEASON' | 'GAMEDAY';
  baseRateOverride: number | null;
  expectedTeamsCount: number;
  expectedGamedaysCount: number;
  expectedTeamsPerGameday: number;
  createdAt: Date;
  updatedAt: Date;
}

const FinancialConfigSchema = new Schema<IFinancialConfig>(
  {
    leagueId: { type: Number, required: true },
    seasonId: { type: Number, required: true },
    costModel: { type: String, enum: ['SEASON', 'GAMEDAY'], required: true },
    baseRateOverride: { type: Number, default: null },
    expectedTeamsCount: { type: Number, default: 0, min: 0 },
    expectedGamedaysCount: { type: Number, default: 0, min: 0 },
    expectedTeamsPerGameday: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

FinancialConfigSchema.index({ leagueId: 1, seasonId: 1 }, { unique: true });

export const FinancialConfig = model<IFinancialConfig>('FinancialConfig', FinancialConfigSchema);
