import { Schema, model, Document } from 'mongoose';

export interface IContact extends Document {
  name: string;
  email: string;
  phone?: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
  },
  { timestamps: true }
);

ContactSchema.index({ name: 1 });

export const Contact = model<IContact>('Contact', ContactSchema);
