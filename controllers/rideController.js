// backend/controllers/rideController.js
import asyncHandler from '../middleware/asyncHandler.js';
import Ride from '../models/rideModel.js';
import User from '../models/userModel.js';

// @desc    Créer une demande de course
// @route   POST /api/rides
const createRide = asyncHandler(async (req, res) => {
  const { pickupLocation, dropoffLocation, paymentMethod, price, driverId } = req.body;

  const ride = await Ride.create({
    client: req.user._id,
    driver: driverId || null,
    pickupLocation,
    dropoffLocation,
    paymentMethod,
    price,
    status: 'requested'
  });

  const populatedRide = await ride.populate('client', 'name profilePicture rating phone');

  // Dispatch
  if (driverId) {
    req.io.to(driverId.toString()).emit('new_ride_request', populatedRide);
  } else {
    // Recherche rayon 5km
    const nearbyDrivers = await User.find({
      role: 'driver',
      isAvailable: true,
      currentLocation: {
        $near: {
          $geometry: { type: "Point", coordinates: pickupLocation.coordinates },
          $maxDistance: 5000
        }
      }
    });

    if (nearbyDrivers.length > 0) {
      nearbyDrivers.forEach(driver => {
        req.io.to(driver._id.toString()).emit('new_ride_request', populatedRide);
      });
    }
  }

  res.status(201).json(populatedRide);
});

// @desc    Accepter une course
// @route   PUT /api/rides/:id/accept
const acceptRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);

  if (!ride) {
    res.status(404);
    throw new Error('Course non trouvée');
  }

  // 1. BLINDAGE ANTI-ANNULATION
  if (ride.status === 'cancelled') {
      res.status(400);
      throw new Error('Désolé, cette course a été annulée par le client.');
  }

  // 2. BLINDAGE ANTI-VOL (Déjà prise)
  if (ride.status !== 'requested') {
      // Cas particulier : Je suis déjà le chauffeur (reconnexion)
      if (ride.status === 'accepted' && ride.driver?.toString() === req.user._id.toString()) {
         const existingRide = await Ride.findById(ride._id)
          .populate('driver', 'name profilePicture phone vehicleInfo rating')
          .populate('client', 'name profilePicture phone');
         return res.json(existingRide);
      }
      
      res.status(400);
      throw new Error('Cette course n\'est plus disponible.');
  }

  // Tout est bon, on accepte
  ride.status = 'accepted';
  ride.driver = req.user._id;
  ride.acceptedAt = Date.now();
  await ride.save();

  const fullRide = await Ride.findById(ride._id)
    .populate('driver', 'name profilePicture phone vehicleInfo rating')
    .populate('client', 'name profilePicture phone');

  // Notif synchronisée
  req.io.to(ride.client._id.toString()).emit('rideAccepted', fullRide);
  req.io.to(req.user._id.toString()).emit('rideAccepted', fullRide);

  res.json(fullRide);
});

// @desc    Démarrer la course
// @route   PUT /api/rides/:id/start
const startRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);

  if (ride) {
    ride.status = 'ongoing';
    ride.startedAt = Date.now();
    await ride.save();

    const fullRide = await Ride.findById(ride._id)
      .populate('driver', 'name profilePicture phone vehicleInfo rating')
      .populate('client', 'name profilePicture phone');

    req.io.to(ride.client.toString()).emit('rideStarted', fullRide);
    res.json(fullRide);
  } else {
    res.status(404);
    throw new Error('Course non trouvée');
  }
});

// @desc    Terminer la course
// @route   PUT /api/rides/:id/complete
const completeRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);

  if (ride) {
    ride.status = 'completed';
    ride.completedAt = Date.now();
    await ride.save();

    const fullRide = await Ride.findById(ride._id)
      .populate('driver', 'name profilePicture phone vehicleInfo rating')
      .populate('client', 'name profilePicture phone');

    req.io.to(ride.client.toString()).emit('rideCompleted', fullRide);
    req.io.to(ride.driver.toString()).emit('rideCompleted', fullRide);

    res.json(fullRide);
  } else {
    res.status(404);
    throw new Error('Course non trouvée');
  }
});

// @desc    Annuler la course
// @route   PUT /api/rides/:id/cancel
const cancelRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);

  if (!ride) {
    res.status(404);
    throw new Error('Course non trouvée');
  }

  // Vérif droits
  const isClient = ride.client.toString() === req.user._id.toString();
  const isDriver = ride.driver && ride.driver.toString() === req.user._id.toString();

  if (!isClient && !isDriver) {
      res.status(401);
      throw new Error('Non autorisé');
  }

  if (ride.status === 'completed' || ride.status === 'ongoing') {
      res.status(400);
      throw new Error('Impossible d\'annuler une course en cours');
  }

  ride.status = 'cancelled';
  await ride.save();

  // SIGNAL CRITIQUE : On prévient TOUT LE MONDE (Drivers + Client)
  // C'est ça qui fait disparaître le modal chez le chauffeur
  req.io.emit('ride_cancelled', { rideId: ride._id });

  res.json({ message: 'Course annulée' });
});

// @desc    Historique
// @route   GET /api/rides/history
const getRideHistory = asyncHandler(async (req, res) => {
  const rides = await Ride.find({ $or: [{ client: req.user._id }, { driver: req.user._id }] })
    .populate('driver', 'name vehicleInfo')
    .populate('client', 'name')
    .sort({ createdAt: -1 });
  res.json(rides);
});

// Autres fonctions (Decline inutile de changer mais je garde l'export)
const declineRide = asyncHandler(async (req, res) => {
    res.json({ message: 'Refusé' }); 
});

export { createRide, acceptRide, declineRide, startRide, completeRide, cancelRide, getRideHistory };