// backend/routes/rideRoutes.js
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

router.route('/').post(protect, createRide);
router.route('/history').get(protect, getRideHistory);
router.route('/:id/accept').put(protect, acceptRide);
router.route('/:id/decline').put(protect, declineRide);
router.route('/:id/start').put(protect, startRide);
router.route('/:id/complete').put(protect, completeRide);

export default router;