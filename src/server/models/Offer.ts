import { Schema, model, Document, Types } from 'mongoose';
import type { OfferLine } from '../../../shared/lib/offerLines';

export interface IOffer extends Document {
  status: 'draft' | 'sending' | 'sent' | 'accepted' | 'rejected';
  associationId: string;
  seasonId: number;
  leagueIds: number[];
  contactId: Types.ObjectId;
  financialConfigId?: Types.ObjectId;
  sentAt?: Date;
  acceptedAt?: Date;
  driveMetadata?: {
    driveFileId?: string;
    driveFolderId?: string;
    driveLink?: string;
    filedAt?: Date;
    lastAttempt?: Date;
    failureReason?: string;
  };
  sendJobId?: string;
  sendJobAttempts?: number;
  lines?: OfferLine[];
  offerNumber?: string;
  offerDate?: Date;
  validUntil?: Date;
  introNote?: string;
  closingNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OfferSchema = new Schema<IOffer>(
  {
    status: {
      type: String,
      enum: ['draft', 'sending', 'sent', 'accepted', 'rejected'],
      default: 'draft',
    },
    associationId: { type: String, required: true },
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
    lines: {
      type: [{
        _id: false,
        label: { type: String, required: true },
        detail: String,
        amount: { type: Number, required: true },
        kind: { type: String, enum: ['league', 'fee', 'discount', 'optional'], required: true },
        leagueId: Number,
      }],
      default: undefined,
    },
    offerNumber: { type: String },
    offerDate: Date,
    validUntil: Date,
    introNote: String,
    closingNote: String,
    sentAt: { type: Date },
    acceptedAt: { type: Date },
    driveMetadata: {
      driveFileId: String,
      driveFolderId: String,
      driveLink: String,
      filedAt: Date,
      lastAttempt: Date,
      failureReason: String,
    },
    sendJobId: String,
    sendJobAttempts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Index for common queries
OfferSchema.index({ status: 1 });
OfferSchema.index({ contactId: 1 });
OfferSchema.index({ associationId: 1, seasonId: 1, status: 1 });

// Offer numbers are unique once assigned; legacy offers have none.
OfferSchema.index({ offerNumber: 1 }, { unique: true, partialFilterExpression: { offerNumber: { $type: 'string' } } });

export const Offer = model<IOffer>('Offer', OfferSchema);
