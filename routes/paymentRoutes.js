// backend/routes/paymentRoutes.js
import express from 'express';
const router = express.Router();

// On importe les nouvelles fonctions du contrôleur SaaS
import { 
  confirmSubscriptionPayment, 
  checkSubscriptionStatus 
} from '../controllers/paymentController.js';

import { protect, driverOnly } from '../middleware/authMiddleware.js';

// --- NOUVELLES ROUTES ABONNEMENT ---

// 1. Payer pour activer (200F ou 1000F)
// POST /api/payments/subscribe
router.post('/subscribe', protect, driverOnly, confirmSubscriptionPayment);

// 2. Vérifier si je peux travailler (Mur)
// GET /api/payments/status
router.get('/status', protect, driverOnly, checkSubscriptionStatus);

export default router;