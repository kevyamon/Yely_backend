// controllers/subscriptionController.js

import asyncHandler from '../middleware/asyncHandler.js';
import Transaction from '../models/transactionModel.js';
import User from '../models/userModel.js';
// Assure-toi d'avoir un utilitaire d'upload ou utilise cloudinary directement ici si besoin
// Pour simplifier, on suppose que le middleware 'upload' a déjà mis l'image dans req.file.path

// @desc    Soumettre une preuve de paiement
// @route   POST /api/subscription/submit-proof
// @access  Private
const submitProof = asyncHandler(async (req, res) => {
  const { type, paymentPhone, amount } = req.body;
  
  if (!req.file) {
    res.status(400);
    throw new Error('Une image de preuve est requise');
  }

  // 1. Déterminer à qui assigner la tâche
  let assignedTo = 'PARTNER'; // Par défaut (Mensuel)
  if (type === 'WEEKLY') {
    assignedTo = 'SUPERADMIN'; // Hebdo va au SuperAdmin
  }

  // 2. Créer la transaction
  const transaction = await Transaction.create({
    driver: req.user._id,
    type: type, // 'WEEKLY' ou 'MONTHLY'
    amount: amount,
    paymentPhone: paymentPhone,
    proofImage: req.file.path, // URL Cloudinary (via Multer-Storage-Cloudinary)
    proofImagePublicId: req.file.filename, // ID pour suppression future
    status: 'PENDING',
    assignedTo: assignedTo
  });

  res.status(201).json({
    message: 'Preuve reçue avec succès',
    transaction
  });
});

// @desc    Vérifier le statut (pour le polling frontend)
// @route   GET /api/subscription/status
const checkStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('subscription');
  res.json(user.subscription);
});

export { submitProof, checkStatus };