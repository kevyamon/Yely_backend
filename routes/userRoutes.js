import express from 'express';
const router = express.Router();

import {
  registerUser,
  authUser, // CORRECTION : loginUser devient authUser pour correspondre au contrôleur
  logoutUser,
  getUserProfile,
  updateUserProfile
} from '../controllers/userController.js';

import { protect } from '../middleware/authMiddleware.js';
import { decrementSubscriptionTime } from '../middleware/subscriptionDecrementMiddleware.js';

// Route Inscription
router.route('/').post(registerUser);

// Route Connexion
// Note : On garde le chemin '/login' pour la compatibilité frontend, mais on utilise le contrôleur authUser
router.post('/login', authUser);

// Route Déconnexion
router.post('/logout', logoutUser);

// Route Profil (Lecture et Modification)
router.route('/profile')
  .get(protect, decrementSubscriptionTime, getUserProfile)
  .put(protect, updateUserProfile);

export default router;