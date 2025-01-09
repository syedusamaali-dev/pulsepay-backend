import { Router } from 'express';
import { getTransactionHistory } from '../controllers/transaction.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.get('/history', authenticateJWT, getTransactionHistory);

export default router;