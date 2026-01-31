// backend/routes/userRoutes.js
import express from 'express';
import {
  registerUser,
  authUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  getUsers,       // Ajout pour l'admin
  deleteUser,     // Ajout pour l'admin
  getUserById,    // Ajout pour l'admin
  updateUser      // Ajout pour l'admin
} from '../controllers/userController.js';

import { protect, admin } from '../middleware/authMiddleware.js';
// On garde ton middleware CRITIQUE pour les abonnements
import { decrementSubscriptionTime } from '../middleware/subscriptionDecrementMiddleware.js';

const router = express.Router();

// --- ROUTES PUBLIQUES (Ouvertes) ---
// Inscription
router.route('/').post(registerUser);

// Connexion (On garde '/login' pour ton frontend actuel)
router.post('/login', authUser);
router.post('/auth', authUser); // Alias de sécurité

// Déconnexion
router.post('/logout', logoutUser);

// --- ROUTES PROTÉGÉES USER ---
router.route('/profile')
  // On conserve ta logique : Protect + Decrement + GetProfile
  .get(protect, decrementSubscriptionTime, getUserProfile)
  .put(protect, updateUserProfile);

// --- ROUTES ADMIN (Si tu en as besoin plus tard) ---
router.route('/')
  .get(protect, admin, getUsers);

router.route('/:id')
  .delete(protect, admin, deleteUser)
  .get(protect, admin, getUserById)
  .put(protect, admin, updateUser);

export default router;