// routes/rideRoutes.js
import express from 'express';
const router = express.Router();
import { createRide } from '../controllers/rideController.js';
import { protect } from '../middleware/authMiddleware.js';

// Route pour créer une course (Nécessite d'être connecté)
// URL : POST /api/rides
router.route('/').post(protect, createRide);

export default router;