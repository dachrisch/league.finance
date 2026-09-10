import { Schema, model, Document, Types } from 'mongoose';

export interface ITrackedLeague extends Document {
  associationId: string;
  contactId: Types.ObjectId | null;
  name: string;
  year: number;
  isYouth: boolean;
  estimatedTeamsCount: string | null;
  estimatedGamedaysCount: string | null;
  comment: string;
  leaguesphereLeagueId: number | null;
  linkedOfferId: Types.ObjectId | null;
  status: 'lead' | 'contacted' | 'offer_in_progress' | 'rejected_pre_offer' | 'closed_historical';
  createdAt: Date;
  updatedAt: Date;
}

const TrackedLeagueSchema = new Schema<ITrackedLeague>(
  {
    associationId: { type: String, required: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', default: null },
    name: { type: String, required: true },
    year: { type: Number, required: true },
    isYouth: { type: Boolean, default: false },
    estimatedTeamsCount: { type: String, default: null },
    estimatedGamedaysCount: { type: String, default: null },
    comment: { type: String, default: '' },
    leaguesphereLeagueId: { type: Number, default: null },
    linkedOfferId: { type: Schema.Types.ObjectId, ref: 'Offer', default: null },
    status: {
      type: String,
      enum: ['lead', 'contacted', 'offer_in_progress', 'rejected_pre_offer', 'closed_historical'],
      default: 'lead',
    },
  },
  { timestamps: true }
);

TrackedLeagueSchema.index({ associationId: 1, year: 1 });

export const TrackedLeague = model<ITrackedLeague>('TrackedLeague', TrackedLeagueSchema);
