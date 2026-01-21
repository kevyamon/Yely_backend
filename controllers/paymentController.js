// controllers/paymentController.js
import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/userModel.js';
import axios from 'axios';

// --- CONFIGURATION WAVE ---
const WAVE_API_URL = 'https://api.wave.com/v1/checkout/sessions';

// --- FONCTION UTILITAIRE : ACTIVER L'ABONNEMENT ---
// (On la met en haut pour qu'elle soit dispo pour tout le monde)
const activateSubscription = async (user, plan) => {
  const now = new Date();
  let durationInHours = 0;
  
  if (plan === 'daily') durationInHours = 24;
  else if (plan === 'weekly') durationInHours = 168; // 7 jours * 24h
  
  user.subscription.status = 'active';
  user.subscription.plan = plan;
  user.subscription.lastPaymentDate = now;
  
  // Logique intelligente : Si l'abonnement est encore valide, on AJOUTE du temps.
  // Sinon, on repart de maintenant.
  const currentExpiry = user.subscription.expiresAt && user.subscription.expiresAt > now 
    ? user.subscription.expiresAt 
    : now;

  user.subscription.expiresAt = new Date(currentExpiry.getTime() + durationInHours * 60 * 60 * 1000);

  await user.save();

  return {
    success: true,
    message: `Abonnement ${plan === 'daily' ? '24H' : 'Semaine'} activé jusqu'au ${user.subscription.expiresAt.toLocaleString()}`,
    expiresAt: user.subscription.expiresAt
  };
};

// @desc    1. INITIER LE PAIEMENT (Créer le lien Wave)
// @route   POST /api/payments/init
// @access  Private (Driver)
const initSubscriptionPayment = asyncHandler(async (req, res) => {
  const { plan } = req.body; // 'daily' (200F) ou 'weekly' (1000F)
  const user = req.user;

  // 1. Définir le prix
  let amount = 0;
  if (plan === 'daily') amount = 200;
  else if (plan === 'weekly') amount = 1000;
  else {
    res.status(400);
    throw new Error('Plan invalide (choisir daily ou weekly)');
  }

  // 2. Créer un ID de Transaction Unique
  // Format : TRX_IDUser_Timestamp (ex: TRX_65a4..._1705689000)
  const transactionId = `TRX_${user._id}_${Date.now()}`;

  // --- 3. LOGIQUE SIMULATION (MODE SANDBOX) ---
  if (process.env.WAVE_ENV === 'sandbox') {
    console.log(`⚠️ MODE SIMULATION : Création transaction fictive ${transactionId}`);
    
    // On renvoie une fausse URL (Le front saura quoi faire)
    return res.json({
      paymentUrl: 'https://sandbox.wave.com/fake-checkout', 
      transactionId: transactionId,
      mode: 'sandbox',
      amount: amount
    });
  }

  // --- 4. LOGIQUE RÉELLE (MODE PRODUCTION) ---
  try {
    const response = await axios.post(
      WAVE_API_URL,
      {
        amount: amount,
        currency: 'XOF',
        error_url: `${process.env.FRONTEND_URL}/subscription?status=error`,
        success_url: `${process.env.FRONTEND_URL}/subscription?status=success`,
        client_reference: transactionId, // Notre lien pour retrouver la trace
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WAVE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // On renvoie l'URL de paiement Wave au Frontend
    res.json({
      paymentUrl: response.data.wave_launch_url,
      transactionId: transactionId,
      mode: 'production',
      amount: amount
    });

  } catch (error) {
    console.error('Erreur Wave:', error.response?.data || error.message);
    res.status(500);
    throw new Error('Erreur lors de la création du paiement Wave');
  }
});

// @desc    2. VÉRIFIER LE PAIEMENT (Confirmer et Activer)
// @route   POST /api/payments/verify
// @access  Private (Driver)
const verifySubscriptionPayment = asyncHandler(async (req, res) => {
  const { transactionId, plan } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }

  // --- LOGIQUE SIMULATION (MODE SANDBOX) ---
  if (process.env.WAVE_ENV === 'sandbox') {
    console.log(`⚠️ MODE SIMULATION : Validation automatique de ${transactionId}`);
    
    // On fait semblant d'attendre 1.5 seconde (pour l'effet réaliste)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // SUCCÈS FORCÉ : On active l'abonnement direct
    const result = await activateSubscription(user, plan);
    return res.json(result);
  }

  // --- LOGIQUE RÉELLE (MODE PRODUCTION) ---
  // Note : En production, idéalement c'est le Webhook qui valide.
  // Mais ici, on peut faire un appel de vérification si nécessaire (Polling).
  
  // Pour l'instant, on bloque la vérification manuelle en prod sans webhook.
  res.status(400);
  throw new Error("En production, attendez la validation automatique ou contactez le support.");
});

// @desc    3. VÉRIFIER LE STATUT (Pour le Mur)
// @route   GET /api/payments/status
// @access  Private (Driver)
const checkSubscriptionStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const now = new Date();

  // Si la date est passée -> On coupe
  if (user.subscription.expiresAt && now > user.subscription.expiresAt) {
    if (user.subscription.status === 'active') {
      user.subscription.status = 'inactive';
      await user.save();
    }
  }

  res.json({
    status: user.subscription.status, // 'active', 'inactive'
    expiresAt: user.subscription.expiresAt,
    plan: user.subscription.plan
  });
});

export { 
  initSubscriptionPayment, 
  verifySubscriptionPayment, 
  checkSubscriptionStatus 
};