// backend/routes/rideRoutes.js
import express from 'express';
const router = express.Router();
import { createRide, getRideHistory } from '../controllers/rideController.js';
import { protect } from '../middleware/authMiddleware.js';

// Route pour créer une course
router.route('/').post(protect, createRide);

// Route pour l'historique
router.route('/history').get(protect, getRideHistory);

export default router;