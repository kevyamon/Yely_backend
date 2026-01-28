// controllers/subscriptionController.js
import asyncHandler from '../middleware/asyncHandler.js';
import Transaction from '../models/transactionModel.js';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs';

// @desc    Soumettre une preuve de paiement
// @route   POST /api/subscription/submit-proof
// @access  Private (Driver only)
const submitSubscriptionProof = asyncHandler(async (req, res) => {
  // Log pour le débogage sur Render
  console.log("📥 Reçu demande preuve:", req.body);
  console.log("📂 Fichier reçu:", req.file);

  const { type, paymentPhoneNumber } = req.body;

  if (!req.file) {
    res.status(400);
    throw new Error('La capture d\'écran est obligatoire.');
  }

  // Vérification de sécurité
  if (!type || !paymentPhoneNumber) {
    // Nettoyage image si erreur
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(400);
    throw new Error('Le type d\'abonnement et le numéro de paiement sont requis.');
  }

  // Calcul du prix et assignation (Logique métier sécurisée)
  let amount = 0;
  let assignedTo = '';
  // Utilisation de variables d'environnement pour la promo
  const isPromoActive = process.env.IS_PROMO_ACTIVE === 'true';

  if (type === 'WEEKLY') {
    amount = isPromoActive ? 1000 : 1200;
    assignedTo = 'SUPERADMIN';
  } else if (type === 'MONTHLY') {
    amount = isPromoActive ? 5000 : 6000;
    assignedTo = 'PARTNER';
  } else {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(400);
    throw new Error('Type d\'abonnement invalide (WEEKLY ou MONTHLY attendu).');
  }

  try {
    // 1. Upload vers Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'yely_pending_proofs',
      use_filename: true,
    });

    // 2. Création de la Transaction
    const transaction = await Transaction.create({
      driver: req.user._id,
      amount,
      type,
      paymentPhoneNumber,
      proofImageUrl: result.secure_url,
      proofImagePublicId: result.public_id,
      assignedTo,
      status: 'PENDING',
    });

    // 3. Nettoyage du fichier local (IMPORTANT sur Render)
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(201).json({
      success: true,
      message: 'Preuve reçue ! En attente de validation.',
      transaction,
    });

  } catch (error) {
    // Nettoyage en cas d'erreur Cloudinary/Mongo
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Erreur Upload:", error);
    res.status(500);
    throw new Error('Erreur lors du traitement de la preuve: ' + error.message);
  }
});

// EXPORT NOMMÉ (C'est ça qui corrige ton erreur !)
export { submitSubscriptionProof };