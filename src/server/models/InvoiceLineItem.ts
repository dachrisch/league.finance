import { Schema, model, Document, Types } from 'mongoose';

export interface IInvoiceLineItem extends Document {
  invoiceId: Types.ObjectId;
  leagueId: number;
  financialConfigId: Types.ObjectId;
  offerPrice: number;
  livePrice: number;
  liveBasis: number;
  chosenSource: 'offer' | 'live' | 'custom';
  customPrice: number | null;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceLineItemSchema = new Schema<IInvoiceLineItem>(
  {
    invoiceId: { type: Schema.Types.ObjectId, required: true, ref: 'Invoice' },
    leagueId: { type: Number, required: true },
    financialConfigId: { type: Schema.Types.ObjectId, required: true, ref: 'FinancialConfig' },
    offerPrice: { type: Number, required: true },
    livePrice: { type: Number, required: true },
    liveBasis: { type: Number, required: true },
    chosenSource: {
      type: String,
      enum: ['offer', 'live', 'custom'],
      required: true,
    },
    customPrice: { type: Number, default: null },
    amount: { type: Number, required: true },
  },
  { timestamps: true }
);

InvoiceLineItemSchema.index({ invoiceId: 1, leagueId: 1 }, { unique: true });
InvoiceLineItemSchema.index({ financialConfigId: 1 });

export const InvoiceLineItem = model<IInvoiceLineItem>('InvoiceLineItem', InvoiceLineItemSchema);
