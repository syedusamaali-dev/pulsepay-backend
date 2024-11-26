import { Request, Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { io } from '../server';

export const executeTransfer = async (req: Request, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { senderAccountId, recipientAccountNumber, amount, description, pin } = req.body;

    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Transfer amount must be greater than zero.' });
      return;
    }

    // 1. Fetch Sender Account
    const senderAccount = await Account.findById(senderAccountId).session(session);
    if (!senderAccount || senderAccount.status !== 'ACTIVE') {
      throw new Error('Sender account is invalid or frozen.');
    }

    // 2. Fetch Sender User for Fraud PIN Verification
    const senderUser = await User.findById(senderAccount.userId);
    if (!senderUser) {
      throw new Error('Sender user record not found.');
    }

    // 3. AI Fraud Shield Threshold: If transfer > $5,000, verify 2FA Step-up Security PIN
    if (amount >= 5000) {
      if (!pin) {
        throw new Error('HIGH_RISK_FRAUD_TRIGGER: Step-up Security PIN required for transfers over $5,000.');
      }
      const isPinValid = await bcrypt.compare(pin, senderUser.pinHash);
      if (!isPinValid) {
        throw new Error('Security PIN verification failed.');
      }
    }

    // 4. Verify Balance
    if (senderAccount.balance < amount) {
      throw new Error('Insufficient funds available.');
    }

    // 5. Fetch Recipient Account
    const recipientAccount = await Account.findOne({ accountNumber: recipientAccountNumber }).session(session);
    if (!recipientAccount || recipientAccount.status !== 'ACTIVE') {
      throw new Error('Recipient account number does not exist or is inactive.');
    }

    if (senderAccount._id.equals(recipientAccount._id)) {
      throw new Error('Cannot transfer funds to your own account.');
    }

    // 6. Perform Double-Entry Balances Update
    senderAccount.balance -= amount;
    recipientAccount.balance += amount;

    await senderAccount.save({ session });
    await recipientAccount.save({ session });

    // 7. Record Transaction Log
    const referenceId = `PULSE-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const transaction = new Transaction({
      referenceId,
      senderAccountId: senderAccount._id,
      recipientAccountId: recipientAccount._id,
      amount,
      currency: senderAccount.currency,
      type: 'TRANSFER',
      status: 'COMPLETED',
      description: description || 'Peer to Peer Payment',
    });

    await transaction.save({ session });

    // Commit Transaction across all documents
    await session.commitTransaction();
    session.endSession();

    // 8. Push Instant WebSockets Event to Recipient
    io.to(recipientAccount.userId.toString()).emit('payment_received', {
      referenceId,
      amount,
      currency: senderAccount.currency,
      senderName: senderUser.fullName,
      newBalance: recipientAccount.balance,
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'Transfer completed successfully.',
      data: {
        referenceId,
        newBalance: senderAccount.balance,
      },
    });
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, error: error.message });
  }
};