import { Schema, model, Document, Types } from 'mongoose';

export interface IFinancialConfig extends Document {
  leagueId: number;
  seasonId: number;
  costModel: 'SEASON' | 'GAMEDAY';
  baseRateOverride: number | null;
  customPrice?: number | null;
  expectedTeamsCount: number;
  expectedGamedaysCount: number;
  expectedTeamsPerGameday: number;
  offerId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFinancialConfigWithPrices extends IFinancialConfig {
  basePrice: number;
  finalPrice: number;
  leagueName: string;
}

const FinancialConfigSchema = new Schema<IFinancialConfig>(
  {
    leagueId: { type: Number, required: true },
    seasonId: { type: Number, required: true },
    costModel: { type: String, enum: ['SEASON', 'GAMEDAY'], required: true },
    baseRateOverride: { type: Number, default: null },
    customPrice: { type: Number, default: null },
    expectedTeamsCount: { type: Number, default: 0, min: 0 },
    expectedGamedaysCount: { type: Number, default: 0, min: 0 },
    expectedTeamsPerGameday: { type: Number, default: 0, min: 0 },
    offerId: { type: Schema.Types.ObjectId, default: null, ref: 'Offer' },
  },
  { timestamps: true }
);

FinancialConfigSchema.index({ leagueId: 1, seasonId: 1 }, { unique: true });
FinancialConfigSchema.index({ offerId: 1 });

export const FinancialConfig = model<IFinancialConfig>('FinancialConfig', FinancialConfigSchema);
