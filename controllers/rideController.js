import asyncHandler from '../middleware/asyncHandler.js';
import Ride from '../models/rideModel.js';
import User from '../models/userModel.js';

// @desc    1. Créer une demande de course (Phase Recherche)
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
  });

  // Notification via Socket
  // On peuple les infos du client pour que le chauffeur voit qui il va chercher
  const populatedRide = await ride.populate('client', 'name profilePicture rating');

  if (driverId) {
    req.io.to(driverId.toString()).emit('newDirectRideRequest', populatedRide);
  } else {
    req.io.to('drivers').emit('newRideAvailable', populatedRide); 
  }

  res.status(201).json(populatedRide);
});

// @desc    2. Accepter une course (Côté Taxi) -> C'EST ICI LA CORRECTION
// @route   PUT /api/rides/:id/accept
const acceptRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);

  if (ride) {
    // Vérification : Si déjà prise
    if (ride.status !== 'requested') {
      res.status(400);
      throw new Error('Cette course n\'est plus disponible');
    }

    ride.status = 'accepted';
    ride.driver = req.user._id;
    ride.acceptedAt = Date.now();
    
    await ride.save();

    // 🟢 CRUCIAL : On remplit (populate) les infos complètes du chauffeur ET du véhicule
    // Sans ça, le client reçoit juste l'ID du chauffeur "65a..." et ne peut rien afficher.
    const fullRide = await Ride.findById(ride._id)
      .populate('driver', 'name profilePicture phone vehicleInfo rating')
      .populate('client', 'name profilePicture phone');

    // On envoie le paquet COMPLET via Socket
    req.io.emit('rideAccepted', fullRide);
    
    res.json(fullRide);
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
    // Optionnel : Si le chauffeur refuse, on pourrait remettre en 'requested' pour un autre
    // Pour l'instant, on note le refus.
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
  })
  .populate('driver', 'name vehicleInfo') // On peuple aussi pour l'historique
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