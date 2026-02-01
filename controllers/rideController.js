// backend/controllers/rideController.js
import asyncHandler from '../middleware/asyncHandler.js';
import Ride from '../models/rideModel.js';
import User from '../models/userModel.js';

// @desc    Créer une demande de course
// @route   POST /api/rides
// @access  Private (Client)
const createRide = asyncHandler(async (req, res) => {
  const { pickupLocation, dropoffLocation, paymentMethod, price, driverId } = req.body;

  // 1. Création
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

  // 2. Dispatch
  if (driverId) {
    // Commande directe
    req.io.to(driverId.toString()).emit('new_ride_request', populatedRide);
  } else {
    // Recherche rayon 5km
    console.log(`📡 Recherche chauffeurs autour de [${pickupLocation.coordinates[0]}, ${pickupLocation.coordinates[1]}]`);

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

    console.log(`🎯 ${nearbyDrivers.length} chauffeur(s) trouvé(s).`);

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
// @access  Private (Driver)
const acceptRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);

  if (!ride) {
    res.status(404);
    throw new Error('Course non trouvée');
  }

  // Si c'est déjà accepté par MOI-MÊME (reconnexion)
  if (ride.status === 'accepted' && ride.driver?.toString() === req.user._id.toString()) {
     const existingRide = await Ride.findById(ride._id)
      .populate('driver', 'name profilePicture phone vehicleInfo rating')
      .populate('client', 'name profilePicture phone');
     return res.json(existingRide);
  }

  // Si c'est déjà pris par un autre
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

  // Notif au client ET au chauffeur
  req.io.to(ride.client._id.toString()).emit('rideAccepted', fullRide); // Pour le client spécifique
  req.io.to(req.user._id.toString()).emit('rideAccepted', fullRide); // Confirmation pour le chauffeur

  res.json(fullRide);
});

// @desc    Refuser une course (Non utilisé en prod pour l'instant mais utile)
// @route   PUT /api/rides/:id/decline
// @access  Private (Driver)
const declineRide = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const ride = await Ride.findById(req.params.id);

  if (ride) {
    // On ne change pas le statut de la course en "declined" globalement sinon personne d'autre ne peut la prendre !
    // On devrait juste logguer le refus ou passer au suivant.
    // Pour simplifier ici, on renvoie juste OK.
    res.json({ message: 'Course refusée' });
  } else {
    res.status(404);
    throw new Error('Course non trouvée');
  }
});

// @desc    Démarrer la course (Client à bord)
// @route   PUT /api/rides/:id/start
// @access  Private (Driver)
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
// @access  Private (Driver)
const completeRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);

  if (ride) {
    ride.status = 'completed';
    ride.completedAt = Date.now();
    await ride.save();

    const fullRide = await Ride.findById(ride._id)
      .populate('driver', 'name profilePicture phone vehicleInfo rating')
      .populate('client', 'name profilePicture phone');

    // Notif finale aux deux parties
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
// @access  Private (Client/Driver)
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

  if (ride.status === 'completed') {
      res.status(400);
      throw new Error('Impossible d\'annuler une course terminée');
  }

  ride.status = 'cancelled';
  await ride.save();

  // SIGNAL D'ANNULATION UNIVERSEL
  req.io.emit('ride_cancelled', { rideId: ride._id });

  res.json({ message: 'Course annulée' });
});

// @desc    Historique
// @route   GET /api/rides/history
// @access  Private
const getRideHistory = asyncHandler(async (req, res) => {
  const rides = await Ride.find({ $or: [{ client: req.user._id }, { driver: req.user._id }] })
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
    cancelRide, 
    getRideHistory 
};