import { Schema, model, Document, Types } from 'mongoose';

export interface IAccount extends Document {
  userId: Types.ObjectId;
  accountNumber: string;
  currency: 'USD' | 'EUR' | 'GBP';
  balance: number;
  status: 'ACTIVE' | 'FROZEN';
  createdAt: Date;
}

const accountSchema = new Schema<IAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    accountNumber: { type: String, required: true, unique: true },
    currency: { type: String, enum: ['USD', 'EUR', 'GBP'], default: 'USD' },
    balance: { type: Number, required: true, default: 1000.0, min: 0 },
    status: { type: String, enum: ['ACTIVE', 'FROZEN'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const Account = model<IAccount>('Account', accountSchema);