// routes/paymentRoutes.js
import express from 'express';
const router = express.Router();
import { 
  initSubscriptionPayment, 
  verifySubscriptionPayment,
  checkSubscriptionStatus 
} from '../controllers/paymentController.js';
import { protect, driverOnly } from '../middleware/authMiddleware.js';

// 1. Démarrer le paiement (Le chauffeur clique sur "Payer")
// POST /api/payments/init
router.post('/init', protect, driverOnly, initSubscriptionPayment);

// 2. Vérifier le paiement (Le chauffeur dit "C'est payé" ou le Front vérifie)
// POST /api/payments/verify
router.post('/verify', protect, driverOnly, verifySubscriptionPayment);

// 3. Vérifier le statut (Le Mur demande "Je suis bloqué ou pas ?")
// GET /api/payments/status
router.get('/status', protect, driverOnly, checkSubscriptionStatus);

export default router;