import { Schema, model, Document, Types } from 'mongoose';

export interface ITransaction extends Document {
  referenceId: string;
  senderAccountId: Types.ObjectId;
  recipientAccountId: Types.ObjectId;
  amount: number;
  currency: string;
  type: 'TRANSFER' | 'DEPOSIT' | 'WITHDRAWAL';
  status: 'COMPLETED' | 'FLAGGED_FRAUD' | 'FAILED';
  description?: string;
  createdAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    referenceId: { type: String, required: true, unique: true },
    senderAccountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    recipientAccountId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, required: true },
    type: { type: String, enum: ['TRANSFER', 'DEPOSIT', 'WITHDRAWAL'], default: 'TRANSFER' },
    status: { type: String, enum: ['COMPLETED', 'FLAGGED_FRAUD', 'FAILED'], default: 'COMPLETED' },
    description: { type: String },
  },
  { timestamps: true }
);

export const Transaction = model<ITransaction>('Transaction', transactionSchema);