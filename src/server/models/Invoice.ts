import { Schema, model, Document, Types } from 'mongoose';

export interface IInvoice extends Document {
  offerId: Types.ObjectId;
  associationId: string;
  contactId: Types.ObjectId;
  customerNumber: number;
  seasonId: number;
  invoiceNumber: string;
  invoiceDate: Date;
  servicePeriod: string;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid';
  paidAt?: Date;
  discount?: {
    type: 'FIXED' | 'PERCENT';
    value: number;
    description: string;
  } | null;
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
  sheetSync?: {
    clientRowSyncedAt?: Date;
    invoiceRowSyncedAt?: Date;
    lastError?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    offerId: { type: Schema.Types.ObjectId, required: true, ref: 'Offer' },
    associationId: { type: String, required: true },
    contactId: { type: Schema.Types.ObjectId, required: true, ref: 'Contact' },
    customerNumber: { type: Number, required: true },
    seasonId: { type: Number, required: true },
    invoiceNumber: { type: String, required: true, unique: true },
    invoiceDate: { type: Date, required: true },
    servicePeriod: { type: String, required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid'],
      default: 'draft',
    },
    paidAt: { type: Date },
    discount: {
      type: {
        type: String,
        enum: ['FIXED', 'PERCENT'],
      },
      value: Number,
      description: String,
      _id: false,
    },
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
    sheetSync: {
      clientRowSyncedAt: Date,
      invoiceRowSyncedAt: Date,
      lastError: String,
    },
  },
  { timestamps: true }
);

InvoiceSchema.index({ offerId: 1 });
InvoiceSchema.index({ status: 1 });
InvoiceSchema.index({ associationId: 1 });

export const Invoice = model<IInvoice>('Invoice', InvoiceSchema);
