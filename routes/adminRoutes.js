// routes/adminRoutes.js
import express from 'express';
const router = express.Router();
import { 
  getDashboardStats, 
  updateUserStatus, 
  addBonus 
} from '../controllers/adminController.js';
import { protect, superAdminOnly } from '../middleware/authMiddleware.js';

// Toutes ces routes sont ultra-sécurisées
router.get('/stats', protect, superAdminOnly, getDashboardStats);
router.put('/user-status/:id', protect, superAdminOnly, updateUserStatus);
router.put('/bonus/:id', protect, superAdminOnly, addBonus);

export default router;