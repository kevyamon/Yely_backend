// backend/controllers/rideController.js
import asyncHandler from '../middleware/asyncHandler.js';
import Ride from '../models/rideModel.js';
import User from '../models/userModel.js';

// @desc    1. Créer une demande de course (Phase Recherche)
// @route   POST /api/rides
const createRide = asyncHandler(async (req, res) => {
  const { pickupLocation, dropoffLocation, paymentMethod, price, driverId } = req.body;

  // Si driverId est fourni, c'est une demande directe à un taxi choisi sur la map
  const ride = await Ride.create({
    client: req.user._id,
    driver: driverId || null, // Peut être null si recherche générale
    pickupLocation,
    dropoffLocation,
    paymentMethod,
    price,
  });

  // Notification via Socket au chauffeur spécifique ou à la zone
  if (driverId) {
    req.io.to(driverId.toString()).emit('newDirectRideRequest', ride);
  } else {
    req.io.emit('newRideRequest', ride);
  }

  res.status(201).json(ride);
});

// @desc    2. Accepter une course (Côté Taxi)
// @route   PUT /api/rides/:id/accept
const acceptRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);

  if (ride) {
    ride.status = 'accepted';
    ride.driver = req.user._id;
    ride.acceptedAt = Date.now();
    const updatedRide = await ride.save();

    // Notifier le client immédiatement
    req.io.emit('rideAccepted', updatedRide);
    res.json(updatedRide);
  } else {
    res.status(404);
    throw new Error('Course non trouvée');
  }
});

// @desc    3. Refuser une course avec motif (Côté Taxi)
// @route   PUT /api/rides/:id/decline
const declineRide = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const ride = await Ride.findById(req.params.id);

  if (ride) {
    ride.status = 'declined';
    ride.declineReason = reason;
    await ride.save();

    // Notifier le client du refus et du motif
    req.io.emit('rideDeclined', { rideId: ride._id, reason });
    res.json({ message: 'Course refusée' });
  } else {
    res.status(404);
    throw new Error('Course non trouvée');
  }
});

// @desc    4. Client à bord (Côté Taxi)
// @route   PUT /api/rides/:id/start
const startRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (ride) {
    ride.status = 'ongoing';
    ride.startedAt = Date.now();
    await ride.save();
    req.io.emit('rideStarted', ride);
    res.json(ride);
  } else {
    res.status(404);
    throw new Error('Course non trouvée');
  }
});

// @desc    5. Course terminée (Côté Taxi)
// @route   PUT /api/rides/:id/complete
const completeRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (ride) {
    ride.status = 'completed';
    ride.completedAt = Date.now();
    await ride.save();
    req.io.emit('rideCompleted', ride);
    res.json(ride);
  } else {
    res.status(404);
    throw new Error('Course non trouvée');
  }
});

// @desc    6. Historique
const getRideHistory = asyncHandler(async (req, res) => {
  const rides = await Ride.find({
    $or: [{ client: req.user._id }, { driver: req.user._id }]
  }).sort({ createdAt: -1 });
  res.json(rides);
});

export { 
  createRide, 
  acceptRide, 
  declineRide, 
  startRide, 
  completeRide, 
  getRideHistory 
};