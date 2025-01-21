import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Account } from '../models/Account';

// Helper to generate an 8-digit unique bank account number
const generateAccountNumber = () => {
  return 'ACC-' + Math.floor(10000000 + Math.random() * 90000000).toString();
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    // 🔍 ADD THIS LOG TO INSPECT THE RAW BODY FROM ANGULAR
    console.log('--- REGISTER REQUEST BODY ---', req.body);

    const { fullName, email, password, pin, initialDeposit } = req.body;

    if (!fullName || !email || !password || !pin) {
      res.status(400).json({ error: 'All fields (fullName, email, password, pin) are required.' });
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: 'User with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const pinHash = await bcrypt.hash(pin, 10);

    const user = new User({
      fullName,
      email,
      passwordHash,
      pinHash,
    });
    await user.save();

    // Parse initialDeposit cleanly (ensure non-zero valid number)
    const startingBalance = initialDeposit !== undefined && initialDeposit !== null && !isNaN(Number(initialDeposit))
      ? Number(initialDeposit)
      : 1000.0;

    console.log('--- ASSIGNED STARTING BALANCE ---', startingBalance);

    const account = new Account({
      userId: user._id,
      accountNumber: generateAccountNumber(),
      currency: 'USD',
      balance: startingBalance, // <--- DYNAMIC STARTING BALANCE
      status: 'ACTIVE',
    });
    await account.save();

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'pulsepay_secret',
      { expiresIn: '1d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        token,
        user: { id: user._id, fullName: user.fullName, email: user.email },
        account: { 
          accountNumber: account.accountNumber, 
          balance: account.balance, 
          currency: account.currency 
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ error: 'Invalid email or password.' });
      return;
    }

    const account = await Account.findOne({ userId: user._id });

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'pulsepay_secret',
      { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: { id: user._id, fullName: user.fullName, email: user.email },
        account,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};