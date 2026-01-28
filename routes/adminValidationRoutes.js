// routes/adminValidationRoutes.js

import express from 'express';
const router = express.Router();
import { 
  getPendingTransactions,
  approveTransaction, 
  rejectTransaction 
} from '../controllers/adminValidationController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly } from '../middleware/admin/superAdminMiddleware.js';

router.route('/pending').get(protect, adminOnly, getPendingTransactions);
router.route('/:transactionId/approve').put(protect, adminOnly, approveTransaction);
router.route('/:transactionId/reject').put(protect, adminOnly, rejectTransaction);

export default router;  
