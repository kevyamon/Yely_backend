// routes/userRoutes.js
import express from 'express';
const router = express.Router();
import {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile
} from '../controllers/userController.js'; // On importe tout du fichier propre

import { protect } from '../middleware/authMiddleware.js';

// Routes Publiques
router.post('/', registerUser);
router.post('/login', loginUser); // On utilise le loginUser "intelligent" ici
router.post('/logout', logoutUser);

// Routes Privées (Nécessite connexion)
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

export default router;