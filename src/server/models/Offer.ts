import { Schema, model, Document, Types } from 'mongoose';

export interface IOffer extends Document {
  associationId: Types.ObjectId;
  seasonId: number;
  selectedLeagueIds: number[];
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'NEGOTIATING' | 'ACCEPTED' | 'REJECTED';
  driveFileId: string | null;
  sentTo: Array<{ email: string; sentAt: Date }>;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt: Date | null;
  viewedAt: Date | null;
  completedAt: Date | null;
}

const OfferSchema = new Schema<IOffer>(
  {
    associationId: { type: Schema.Types.ObjectId, required: true, ref: 'Association' },
    seasonId: { type: Number, required: true },
    selectedLeagueIds: { type: [Number], required: true, default: [] },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'VIEWED', 'NEGOTIATING', 'ACCEPTED', 'REJECTED'],
      default: 'DRAFT',
    },
    driveFileId: { type: String, default: null },
    sentTo: [
      {
        email: String,
        sentAt: Date,
      },
    ],
    notes: { type: String, default: '' },
    sentAt: { type: Date, default: null },
    viewedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

OfferSchema.index({ associationId: 1, seasonId: 1 });

export const Offer = model<IOffer>('Offer', OfferSchema);
