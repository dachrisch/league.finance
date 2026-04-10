import { Schema, model, Document, Types } from 'mongoose';

export interface IOfferLineItem extends Document {
  offerId: Types.ObjectId;
  leagueId: number;
  leagueName: string;
  basePrice: number;
  customPrice: number | null;
  finalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

const OfferLineItemSchema = new Schema<IOfferLineItem>(
  {
    offerId: { type: Schema.Types.ObjectId, required: true, ref: 'Offer' },
    leagueId: { type: Number, required: true },
    leagueName: { type: String, required: true },
    basePrice: { type: Number, required: true },
    customPrice: { type: Number, default: null },
  },
  { timestamps: true }
);

OfferLineItemSchema.virtual('finalPrice').get(function () {
  return this.customPrice !== null ? this.customPrice : this.basePrice;
});

OfferLineItemSchema.index({ offerId: 1, leagueId: 1 }, { unique: true });

export const OfferLineItem = model<IOfferLineItem>('OfferLineItem', OfferLineItemSchema);
