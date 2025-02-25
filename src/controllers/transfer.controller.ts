import { Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Account } from '../models/Account';
import { Transaction } from '../models/Transaction';
import { User } from '../models/User';
import { io } from '../server';
import { AuthenticatedRequest } from '../middleware/auth';

export const executeTransfer = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { recipientAccountNumber, amount, description, pin } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized. User ID missing from token.' });
      return;
    }

    if (!amount || amount <= 0) {
      res.status(400).json({ success: false, error: 'Transfer amount must be greater than zero.' });
      return;
    }

    // 1. Fetch Logged-in Sender Account within session
    const senderAccount = await Account.findOne({ userId }).session(session);
    if (!senderAccount || senderAccount.status !== 'ACTIVE') {
      throw new Error('Sender account is invalid or frozen.');
    }

    // 2. Fetch Sender User record within session
    const senderUser = await User.findById(userId).session(session);
    if (!senderUser) {
      throw new Error('Sender user record not found.');
    }

    // 3. AI Fraud Shield Threshold: Check Security PIN for transfers >= $5,000
    if (amount >= 5000) {
      if (!pin) {
        throw new Error('HIGH_RISK_FRAUD_TRIGGER: Step-up Security PIN required for transfers over $5,000.');
      }
      if (!senderUser.pinHash) {
        throw new Error('Security PIN not configured for this account.');
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

    // 5. Fetch Recipient Account within session
    const recipientAccount = await Account.findOne({ accountNumber: recipientAccountNumber }).session(session);
    if (!recipientAccount || recipientAccount.status !== 'ACTIVE') {
      throw new Error('Recipient account number does not exist or is inactive.');
    }

    if (senderAccount._id.equals(recipientAccount._id)) {
      throw new Error('Cannot transfer funds to your own account.');
    }

    // 6. Double-Entry Atomic Balance Updates
    senderAccount.balance -= amount;
    recipientAccount.balance += amount;

    await senderAccount.save({ session });
    await recipientAccount.save({ session });

    // 7. Create Transaction Record
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

    // Commit Transaction across all documents atomically
    await session.commitTransaction();
    session.endSession();

    // 8. Safely Push Real-Time Socket.io Event to Recipient Room
    // Wrap in try-catch so socket errors don't fail an already committed HTTP response
    try {
      const recipientUserIdStr = recipientAccount.userId.toString();
      const senderDisplayName = senderUser.fullName || 'PulsePay User';

      io.to(recipientUserIdStr).emit('payment_received', {
        referenceId,
        amount,
        currency: senderAccount.currency,
        senderName: senderDisplayName,
        newBalance: recipientAccount.balance,
        timestamp: new Date(),
      });

      console.log(`📡 [PulsePay Socket] Emitted 'payment_received' to room: ${recipientUserIdStr}`);
    } catch (socketError) {
      console.error('⚠️ Real-time notification dispatch failed (Transaction still succeeded):', socketError);
    }

    // 9. Send Final Response
    res.status(200).json({
      success: true,
      message: 'Transfer completed successfully.',
      data: {
        referenceId,
        amount,
        senderAccountNumber: senderAccount.accountNumber,
        recipientAccountNumber,
        newBalance: senderAccount.balance,
      },
    });
  } catch (error: any) {
    // End session safely on error
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    res.status(400).json({ success: false, error: error.message });
  }
};