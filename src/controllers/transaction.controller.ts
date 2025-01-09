import { Response } from 'express';
import { Transaction } from '../models/Transaction';
import { Account } from '../models/Account';
import { AuthenticatedRequest } from '../middleware/auth';

export const getTransactionHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized.' });
      return;
    }

    // Find the user's account ID
    const account = await Account.findOne({ userId });
    if (!account) {
      res.status(404).json({ success: false, error: 'Account not found.' });
      return;
    }

    // Fetch transactions where the account is either the sender or recipient
    const transactions = await Transaction.find({
      $or: [{ senderAccountId: account._id }, { recipientAccountId: account._id }],
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'senderAccountId',
        select: 'accountNumber userId',
        populate: { path: 'userId', select: 'fullName email' },
      })
      .populate({
        path: 'recipientAccountId',
        select: 'accountNumber userId',
        populate: { path: 'userId', select: 'fullName email' },
      })
      .exec();

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};