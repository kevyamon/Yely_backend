// routes/userRoutes.js
import express from 'express';
const router = express.Router();

// CORRECTION ICI : J'ai retiré 'authUser' qui n'existe pas dans ce fichier
import {
  registerUser,
  logoutUser,
  getUserProfile,
} from '../controllers/userController.js';

import { authUserWithSuperAdminDetection } from '../controllers/userControllerUpdate.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { decrementSubscriptionTime } from '../middleware/subscriptionDecrementMiddleware.js';

// Route pour l'inscription (Register)
router.route('/').post(registerUser);

// Route pour la connexion (Login) avec ta détection spéciale SuperAdmin
router.post('/login', authUserWithSuperAdminDetection);

// Route pour la déconnexion
router.post('/logout', logoutUser);

// Route pour le profil (Lecture seule ici selon ton code)
router.route('/profile').get(protect, decrementSubscriptionTime, getUserProfile);

export default router;