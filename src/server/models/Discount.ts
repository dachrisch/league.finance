import { Schema, model, Document, Types } from 'mongoose';

export interface IDiscount extends Document {
  configId: Types.ObjectId;
  type: 'FIXED' | 'PERCENT';
  value: number;
  description: string;
  createdAt: Date;
}

const DiscountSchema = new Schema<IDiscount>(
  {
    configId: { type: Schema.Types.ObjectId, ref: 'FinancialConfig', required: true },
    type: { type: String, enum: ['FIXED', 'PERCENT'], required: true },
    value: { type: Number, required: true, min: 0 },
    description: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Discount = model<IDiscount>('Discount', DiscountSchema);
