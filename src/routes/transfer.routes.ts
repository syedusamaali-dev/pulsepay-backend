import { Router } from 'express';
import { executeTransfer } from '../controllers/transfer.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Protected route for initiating atomic transfers
router.post('/execute', authenticateJWT, executeTransfer);

export default router;