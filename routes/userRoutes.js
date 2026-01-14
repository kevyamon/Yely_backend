// routes/userRoutes.js
import express from 'express';
const router = express.Router();
import {
  authUser,
  registerUser,
  logoutUser,
  getUserProfile,
} from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

// Route pour l'inscription (POST)
router.route('/').post(registerUser);

// Route pour la connexion
router.post('/login', authUser);

// Route pour la déconnexion
router.post('/logout', logoutUser);

// Route pour le profil (Nécessite d'être connecté -> protect)
router.route('/profile').get(protect, getUserProfile);

export default router;