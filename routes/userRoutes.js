// routes/userRoutes.js

import express from 'express';
const router = express.Router();
import {
  authUser,
  registerUser,
  logoutUser,
  getUserProfile,
} from '../controllers/userController.js';
import { authUserWithSuperAdminDetection } from '../controllers/userControllerUpdate.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { decrementSubscriptionTime } from '../middleware/subscriptionDecrementMiddleware.js';

router.route('/').post(registerUser);
router.post('/login', authUserWithSuperAdminDetection);
router.post('/logout', logoutUser);
router.route('/profile').get(protect, decrementSubscriptionTime, getUserProfile);

export default router;