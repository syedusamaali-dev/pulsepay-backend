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
    const { fullName, email, password, pin } = req.body;

    if (!fullName || !email || !password || !pin) {
      res.status(400).json({ error: 'All fields (fullName, email, password, pin) are required.' });
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: 'User with this email already exists.' });
      return;
    }

    // Hash Password and 2FA Step-up PIN
    const passwordHash = await bcrypt.hash(password, 10);
    const pinHash = await bcrypt.hash(pin, 10);

    // 1. Create User
    const user = new User({
      fullName,
      email,
      passwordHash,
      pinHash,
    });
    await user.save();

    // 2. Automatically provision an active Bank Account with $1,000 starting balance
    const account = new Account({
      userId: user._id,
      accountNumber: generateAccountNumber(),
      currency: 'USD',
      balance: 1000.0,
      status: 'ACTIVE',
    });
    await account.save();

    // 3. Sign JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'pulsepay_secret',
      { expiresIn: '1d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered and bank account provisioned successfully.',
      data: {
        token,
        user: { id: user._id, fullName: user.fullName, email: user.email },
        account: { accountNumber: account.accountNumber, balance: account.balance, currency: account.currency },
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