// backend/controllers/rideController.js
import asyncHandler from '../middleware/asyncHandler.js';
import Ride from '../models/rideModel.js';
import User from '../models/userModel.js';

// @desc    Créer une nouvelle demande de course
// @route   POST /api/rides
// @access  Private (Rider only)
const createRide = asyncHandler(async (req, res) => {
  const { pickupLocation, dropoffLocation, paymentMethod } = req.body;

  // LOGIQUE SÉCURITÉ : Le Backend calcule le prix (Ne jamais faire confiance au Frontend)
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

// @desc    Récupérer l'historique des courses (Client ou Chauffeur)
// @route   GET /api/rides/history
// @access  Private
const getRideHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // On cherche toutes les courses où l'utilisateur est soit 'client', soit 'driver'
  const rides = await Ride.find({
    $or: [
      { client: userId }, 
      { driver: userId }
    ]
  }).sort({ createdAt: -1 }); // Plus récent en haut

  res.json(rides);
});

export { createRide, getRideHistory };