// controllers/paymentController.js
import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/userModel.js';
import Ride from '../models/rideModel.js';

// @desc    Recharger le compte Yély (Demande manuelle 0% frais)
// @route   POST /api/payments/recharge
// @access  Private
const requestRecharge = asyncHandler(async (req, res) => {
  const { amount, transactionId } = req.body;

  // Sécurité : On crée une notification pour l'Admin (Toi)
  // En attendant le dashboard admin, on log la demande
  console.log(`💰 DEMANDE DE RECHARGE : ${req.user.name} a envoyé ${amount} FCFA (ID: ${transactionId})`);

  res.status(200).json({ 
    message: 'Demande envoyée. Votre solde sera mis à jour après vérification par Yély.' 
  });
});

// @desc    Valider une recharge (Admin Only)
// @route   PUT /api/payments/validate/:userId
// @access  Private/Admin
const validateRecharge = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const user = await User.findById(req.params.userId);

  if (user) {
    user.wallet += Number(amount);
    await user.save();
    res.json({ message: 'Compte rechargé avec succès', newBalance: user.wallet });
  } else {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }
});

// @desc    Retrait chauffeur (Vers Wave)
// @route   POST /api/payments/withdraw
// @access  Private/Driver
const withdrawEarnings = asyncHandler(async (req, res) => {
  const chauffeur = await User.findById(req.user._id);
  const commissionRate = 0.10; // 10% de commission pour Yély

  if (chauffeur.wallet <= 0) {
    res.status(400);
    throw new Error('Votre solde est vide');
  }

  const amountToTransfer = chauffeur.wallet * (1 - commissionRate);
  
  // LOGIQUE WAVE : Ici on appellera l'API Wave Business
  console.log(`💸 TRANSFERT WAVE : Envoi de ${amountToTransfer} FCFA vers le numéro ${chauffeur.phone}`);

  chauffeur.wallet = 0; // On remet le solde à zéro
  await chauffeur.save();

  res.json({ message: 'Virement Wave effectué (Moins 10% commission Yély)' });
});

export { requestRecharge, validateRecharge, withdrawEarnings };