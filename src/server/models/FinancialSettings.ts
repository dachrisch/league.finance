import { Schema, model, Document } from 'mongoose';

export interface IFinancialSettings extends Document {
  defaultRatePerTeamSeason: number;
  defaultRatePerTeamGameday: number;
}

const FinancialSettingsSchema = new Schema<IFinancialSettings>({
  defaultRatePerTeamSeason: { type: Number, default: 0, min: 0 },
  defaultRatePerTeamGameday: { type: Number, default: 0, min: 0 },
});

export const FinancialSettings = model<IFinancialSettings>('FinancialSettings', FinancialSettingsSchema);

/** Returns the singleton, creating it if absent. */
export async function getOrCreateSettings(): Promise<IFinancialSettings> {
  const doc = await FinancialSettings.findOneAndUpdate(
    {},
    {},
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
  return doc!;
}
