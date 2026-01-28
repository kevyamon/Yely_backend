import express from 'express';
const router = express.Router();

import {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile
} from '../controllers/userController.js';

import { protect } from '../middleware/authMiddleware.js';
import { decrementSubscriptionTime } from '../middleware/subscriptionDecrementMiddleware.js';

// Route Inscription
router.route('/').post(registerUser);

// Route Connexion
router.post('/login', loginUser);

// Route Déconnexion
router.post('/logout', logoutUser);

// Route Profil (Lecture et Modification)
router.route('/profile')
  .get(protect, decrementSubscriptionTime, getUserProfile)
  .put(protect, updateUserProfile);

export default router;