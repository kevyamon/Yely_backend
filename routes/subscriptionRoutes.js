// routes/subscriptionRoutes.js

import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import { submitSubscriptionProof } from '../controllers/subscriptionController.js';
import { getSubscriptionStatus } from '../controllers/subscriptionStatusController.js';
import { decrementSubscriptionTime } from '../middleware/subscriptionDecrementMiddleware.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post(
  '/submit-proof',
  protect,
  upload.single('proofImage'), 
  submitSubscriptionProof
);

router.get(
  '/status',
  protect,
  decrementSubscriptionTime,
  getSubscriptionStatus
);

export default router;