import { Schema, model, Document } from 'mongoose';

export interface IContact extends Document {
  name: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  createdAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Contact = model<IContact>('Contact', ContactSchema);
