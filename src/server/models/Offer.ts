import { Schema, model, Document, Types } from 'mongoose';

export interface IOffer extends Document {
  status: 'draft' | 'sent' | 'accepted';
  associationId: number;
  seasonId: number;
  leagueIds: number[];
  contactId: Types.ObjectId;
  financialConfigId?: Types.ObjectId;
  sentAt?: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OfferSchema = new Schema<IOffer>(
  {
    status: {
      type: String,
      enum: ['draft', 'sent', 'accepted'],
      default: 'draft',
    },
    associationId: { type: Number, required: true },
    seasonId: { type: Number, required: true },
    leagueIds: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) => v.length > 0,
        message: 'leagueIds must have at least 1 element',
      },
    },
    contactId: { type: Schema.Types.ObjectId, required: true, ref: 'Contact' },
    financialConfigId: { type: Schema.Types.ObjectId, ref: 'FinancialConfig' },
    sentAt: { type: Date },
    acceptedAt: { type: Date },
  },
  { timestamps: true }
);

// Unique partial index: prevents duplicate draft/sent offers for same association-season
// but allows new draft offers after acceptance
OfferSchema.index(
  { associationId: 1, seasonId: 1, status: 1 },
  {
    partialFilterExpression: { status: { $in: ['draft', 'sent'] } },
    unique: true,
  }
);

export const Offer = model<IOffer>('Offer', OfferSchema);
