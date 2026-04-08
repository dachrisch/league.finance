import { Schema, model, Document } from 'mongoose';

export interface IAssociation extends Document {
  name: string;
  description: string;
  email: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssociationSchema = new Schema<IAssociation>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { timestamps: true }
);

export const Association = model<IAssociation>('Association', AssociationSchema);
