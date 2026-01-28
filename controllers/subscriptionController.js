// kevyamon/yely_backend/controllers/subscriptionController.js
import asyncHandler from '../middleware/asyncHandler.js'; // Note le .js à la fin !
import Transaction from '../models/transactionModel.js';
import cloudinary from '../config/cloudinary.js';
import fs from 'fs';

// @desc    Soumettre une preuve de paiement
// @route   POST /api/subscription/submit-proof
// @access  Private (Driver only)
const submitSubscriptionProof = asyncHandler(async (req, res) => {
  const { type, paymentPhoneNumber } = req.body;

  if (!req.file) {
    res.status(400);
    throw new Error('La capture d\'écran est obligatoire.');
  }

  if (!type || !paymentPhoneNumber) {
    res.status(400);
    throw new Error('Le type d\'abonnement et le numéro de paiement sont requis.');
  }

  let amount = 0;
  let assignedTo = '';
  const isPromoActive = process.env.IS_PROMO_ACTIVE === 'true';

  if (type === 'WEEKLY') {
    amount = isPromoActive ? 1000 : 1200;
    assignedTo = 'SUPERADMIN';
  } else if (type === 'MONTHLY') {
    amount = isPromoActive ? 5000 : 6000;
    assignedTo = 'PARTNER';
  } else {
    // Nettoyage si erreur
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(400);
    throw new Error('Type d\'abonnement invalide.');
  }

  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'yely_pending_proofs',
      use_filename: true,
    });

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

    fs.unlinkSync(req.file.path);

    res.status(201).json({
      success: true,
      message: 'Preuve reçue ! En attente de validation.',
      transaction,
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500);
    throw new Error('Erreur upload: ' + error.message);
  }
});

export { submitSubscriptionProof };