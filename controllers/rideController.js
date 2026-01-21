// backend/controllers/rideController.js
import asyncHandler from '../middleware/asyncHandler.js';
import Ride from '../models/rideModel.js';
import User from '../models/userModel.js';

// @desc    1. Créer une demande
const createRide = asyncHandler(async (req, res) => {
  const { pickupLocation, dropoffLocation, paymentMethod, price, driverId } = req.body;

  const ride = await Ride.create({
    client: req.user._id,
    driver: driverId || null,
    pickupLocation,
    dropoffLocation,
    paymentMethod,
    price,
  });

  const populatedRide = await ride.populate('client', 'name profilePicture rating');

  if (driverId) {
    req.io.to(driverId.toString()).emit('newDirectRideRequest', populatedRide);
  } else {
    req.io.to('drivers').emit('newRideAvailable', populatedRide); 
  }

  res.status(201).json(populatedRide);
});

// @desc    2. Accepter (CORRIGÉ : Anti-doublon)
const acceptRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);

  if (ride) {
    // IDEMPOTENCE : Si c'est déjà MOI le chauffeur, on renvoie succès sans erreur (pour gérer le double clic)
    if (ride.status === 'accepted' && ride.driver.toString() === req.user._id.toString()) {
       const existingRide = await Ride.findById(ride._id)
        .populate('driver', 'name profilePicture phone vehicleInfo rating')
        .populate('client', 'name profilePicture phone');
       return res.json(existingRide);
    }

    if (ride.status !== 'requested') {
      res.status(400);
      throw new Error('Cette course n\'est plus disponible');
    }

    ride.status = 'accepted';
    ride.driver = req.user._id;
    ride.acceptedAt = Date.now();
    await ride.save();

    const fullRide = await Ride.findById(ride._id)
      .populate('driver', 'name profilePicture phone vehicleInfo rating')
      .populate('client', 'name profilePicture phone');

    req.io.emit('rideAccepted', fullRide);
    res.json(fullRide);
  } else {
    res.status(404);
    throw new Error('Course non trouvée');
  }
});

// @desc    3. Refuser
const declineRide = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const ride = await Ride.findById(req.params.id);

  if (ride) {
    ride.status = 'declined';
    ride.declineReason = reason;
    await ride.save();
    req.io.emit('rideDeclined', { rideId: ride._id, reason });
    res.json({ message: 'Course refusée' });
  } else {
    res.status(404);
    throw new Error('Course non trouvée');
  }
});

// @desc    4. Client à bord (CORRIGÉ : Populate complet)
const startRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (ride) {
    ride.status = 'ongoing';
    ride.startedAt = Date.now();
    await ride.save();

    // On s'assure de renvoyer l'objet complet pour que le client ne perde pas les infos
    const fullRide = await Ride.findById(ride._id)
      .populate('driver', 'name profilePicture phone vehicleInfo rating')
      .populate('client', 'name profilePicture phone');

    req.io.emit('rideStarted', fullRide);
    res.json(fullRide);
  } else {
    res.status(404);
    throw new Error('Course non trouvée');
  }
});

// @desc    5. Terminer (CORRIGÉ : Populate complet)
const completeRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (ride) {
    ride.status = 'completed';
    ride.completedAt = Date.now();
    await ride.save();

    const fullRide = await Ride.findById(ride._id)
      .populate('driver', 'name profilePicture phone vehicleInfo rating')
      .populate('client', 'name profilePicture phone');

    req.io.emit('rideCompleted', fullRide);
    res.json(fullRide);
  } else {
    res.status(404);
    throw new Error('Course non trouvée');
  }
});

// @desc    6. Historique
const getRideHistory = asyncHandler(async (req, res) => {
  const rides = await Ride.find({
    $or: [{ client: req.user._id }, { driver: req.user._id }]
  })
  .populate('driver', 'name vehicleInfo')
  .populate('client', 'name')
  .sort({ createdAt: -1 });
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