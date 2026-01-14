// routes/paymentRoutes.js
import express from 'express';
const router = express.Router();
import { 
  requestRecharge, 
  validateRecharge, 
  withdrawEarnings 
} from '../controllers/paymentController.js';
import { protect, admin, driverOnly } from '../middleware/authMiddleware.js';

router.post('/recharge', protect, requestRecharge);
router.put('/validate/:userId', protect, admin, validateRecharge);
router.post('/withdraw', protect, driverOnly, withdrawEarnings);

export default router;