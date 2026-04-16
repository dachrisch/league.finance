import { Schema, model, Document, Types } from 'mongoose';

export interface IOffer extends Document {
  status: 'draft' | 'sending' | 'sent' | 'accepted';
  associationId: string;
  seasonId: number;
  leagueIds: number[];
  contactId: Types.ObjectId;
  financialConfigId?: Types.ObjectId;
  sentAt?: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  sendJobId?: string;
  sendJobAttempts?: number;
  emailMetadata?: {
    sentVia: 'gmail';
    messageId?: string;
    driveFileId?: string;
    driveFolderId?: string;
    driveLink?: string;
    recipientEmail: string;
    sentAt: Date;
    lastSendAttempt?: Date;
    failureReason?: string;
  };
}

const OfferSchema = new Schema<IOffer>(
  {
    status: {
      type: String,
      enum: ['draft', 'sending', 'sent', 'accepted'],
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
    sentAt: { type: Date },
    acceptedAt: { type: Date },
    sendJobId: { type: String },
    sendJobAttempts: { type: Number, default: 0 },
    emailMetadata: {
      sentVia: { type: String, enum: ['gmail'] },
      messageId: { type: String },
      driveFileId: { type: String },
      driveFolderId: { type: String },
      driveLink: { type: String },
      recipientEmail: { type: String },
      sentAt: { type: Date },
      lastSendAttempt: { type: Date },
      failureReason: { type: String },
    },
  },
  { timestamps: true }
);

// Unique partial index: prevents duplicate draft/sending/sent offers for same association-season
// but allows new draft offers after acceptance
OfferSchema.index(
  { associationId: 1, seasonId: 1, status: 1 },
  {
    partialFilterExpression: { status: { $in: ['draft', 'sending', 'sent'] } },
    unique: true,
  }
);

// Index for common queries
OfferSchema.index({ status: 1 });
OfferSchema.index({ contactId: 1 });
OfferSchema.index({ associationId: 1 });

export const Offer = model<IOffer>('Offer', OfferSchema);
