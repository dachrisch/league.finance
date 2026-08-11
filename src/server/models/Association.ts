import { Schema, model, Document } from 'mongoose';

export interface IAssociation extends Document {
  name: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  leaguesphereAssociationId: number | null;
  customerNumber: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const AssociationSchema = new Schema<IAssociation>(
  {
    name: { type: String, required: true },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    leaguesphereAssociationId: { type: Number, required: false, default: null },
    customerNumber: { type: Number, default: null },
  },
  { timestamps: true }
);

AssociationSchema.index(
  { customerNumber: 1 },
  { unique: true, partialFilterExpression: { customerNumber: { $type: 'number' } } }
);

export const Association = model<IAssociation>('Association', AssociationSchema);
