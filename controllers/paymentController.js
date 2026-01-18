// backend/controllers/paymentController.js
import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/userModel.js';

// @desc    Payer un abonnement (Jour ou Semaine) pour débloquer l'app
// @route   POST /api/payments/subscribe
// @access  Private (Driver only)
const confirmSubscriptionPayment = asyncHandler(async (req, res) => {
  const { plan, paymentMethod } = req.body; // plan = 'daily' ou 'weekly'
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }

  // --- 1. DÉFINITION DES TARIFS ET DURÉES ---
  let durationInHours = 0;
  let price = 0;

  if (plan === 'daily') {
    durationInHours = 24;      // 24 Heures
    price = 200;               // 200 FCFA
  } else if (plan === 'weekly') {
    durationInHours = 24 * 7;  // 7 Jours
    price = 1000;              // 1000 FCFA (Promo)
  } else {
    res.status(400);
    throw new Error('Type d\'abonnement invalide (daily ou weekly)');
  }

  // --- 2. SIMULATION DU PAIEMENT (WAVE / ORANGE / MTN) ---
  // C'est ici qu'on appellera l'API de Wave plus tard.
  // Pour l'instant, on simule que le paiement est passé.
  console.log(`💰 PAIEMENT REÇU : ${user.name} a payé ${price} FCFA pour le plan ${plan} via ${paymentMethod || 'Wave'}`);

  // --- 3. ACTIVATION DE L'ABONNEMENT ---
  const now = new Date();
  
  // Logique : On active à partir de MAINTENANT
  user.subscription.status = 'active';
  user.subscription.plan = plan;
  user.subscription.lastPaymentDate = now;
  
  // Calcul de la date d'expiration (Maintenant + Durée)
  user.subscription.expiresAt = new Date(now.getTime() + durationInHours * 60 * 60 * 1000);

  const updatedUser = await user.save();

  res.json({
    message: `Abonnement ${plan === 'daily' ? '24H' : 'Semaine'} activé avec succès !`,
    subscription: updatedUser.subscription,
    expiresAt: updatedUser.subscription.expiresAt
  });
});

// @desc    Vérifier le statut (Appelé quand l'app s'ouvre)
// @route   GET /api/payments/status
// @access  Private
const checkSubscriptionStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  
  if (!user) {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }

  const now = new Date();
  
  // Si la date d'expiration est passée -> On coupe
  if (user.subscription.expiresAt && now > user.subscription.expiresAt) {
    user.subscription.status = 'inactive';
    await user.save();
  }

  res.json(user.subscription);
});

export { confirmSubscriptionPayment, checkSubscriptionStatus };