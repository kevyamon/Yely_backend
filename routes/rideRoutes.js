// routes/rideRoutes.js

import express from 'express';
const router = express.Router();
import { 
  createRide, 
  getRideHistory, 
  acceptRide, 
  declineRide, 
  startRide, 
  completeRide 
} from '../controllers/rideController.js';
import { protect } from '../middleware/authMiddleware.js';
import { decrementSubscriptionTime } from '../middleware/subscriptionDecrementMiddleware.js';

router.route('/').post(protect, decrementSubscriptionTime, createRide);
router.route('/history').get(protect, decrementSubscriptionTime, getRideHistory);
router.route('/:id/accept').put(protect, decrementSubscriptionTime, acceptRide);
router.route('/:id/decline').put(protect, decrementSubscriptionTime, declineRide);
router.route('/:id/start').put(protect, decrementSubscriptionTime, startRide);
router.route('/:id/complete').put(protect, decrementSubscriptionTime, completeRide);

export default router;