// controllers/rideController.js
import asyncHandler from '../middleware/asyncHandler.js';
import Ride from '../models/rideModel.js';
import User from '../models/userModel.js';

// @desc    Créer une nouvelle demande de course
// @route   POST /api/rides
// @access  Private (Rider only)
const createRide = asyncHandler(async (req, res) => {
  const { pickupLocation, dropoffLocation, paymentMethod } = req.body;

  // LOGIQUE SÉCURITÉ : Le Backend calcule le prix (Ne jamais faire confiance au Frontend)
  // Ici on mettra une formule : Distance * Tarif_KM
  const calculatedPrice = 1500; // Exemple fixe pour l'instant

  // Vérification si paiement par crédit : le client a-t-il assez d'argent ?
  if (paymentMethod === 'yely_credit' && req.user.wallet < calculatedPrice) {
    res.status(400);
    throw new Error('Solde Yély insuffisant pour cette course');
  }

  const ride = await Ride.create({
    client: req.user._id,
    pickupLocation,
    dropoffLocation,
    paymentMethod,
    price: calculatedPrice,
  });

  // On prévient les chauffeurs aux alentours via Socket.io (Temps réel)
  req.io.emit('newRideRequest', ride);

  res.status(201).json(ride);
});

export { createRide };