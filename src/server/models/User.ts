import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  googleId: string;
  displayName: string;
  role: 'admin' | 'viewer';
  googleAccessToken?: string;
  googleRefreshToken?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    googleId: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    role: { type: String, enum: ['admin', 'viewer'], default: 'viewer' },
    googleAccessToken: { type: String },
    googleRefreshToken: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const User = model<IUser>('User', UserSchema);
