// routes/userRoutes.js
import express from 'express';
const router = express.Router();

// On importe TOUT depuis le bon fichier controller mis à jour
import {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile // J'ai ajouté l'update profile manquante dans l'import
} from '../controllers/userController.js';

import { protect } from '../middleware/authMiddleware.js';
import { decrementSubscriptionTime } from '../middleware/subscriptionDecrementMiddleware.js';

// Route Inscription
router.route('/').post(registerUser);

// Route Connexion (Celle qui contient maintenant l'Auto-Promotion)
router.post('/login', loginUser);

// Route Déconnexion
router.post('/logout', logoutUser);

// Route Profil (Lecture et Modification)
router.route('/profile')
  .get(protect, decrementSubscriptionTime, getUserProfile)
  .put(protect, updateUserProfile);

export default router;