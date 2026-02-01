// backend/controllers/rideController.js
import asyncHandler from '../middleware/asyncHandler.js';
import Ride from '../models/rideModel.js';
import User from '../models/userModel.js';

// @desc    1. Créer une demande (AVEC RECHERCHE GÉOGRAPHIQUE)
const createRide = asyncHandler(async (req, res) => {
  const { pickupLocation, dropoffLocation, paymentMethod, price, driverId } = req.body;

  // 1. Création de la course en base
  const ride = await Ride.create({
    client: req.user._id,
    driver: driverId || null,
    pickupLocation,
    dropoffLocation,
    paymentMethod,
    price,
    status: 'requested' // On s'assure du statut initial
  });

  const populatedRide = await ride.populate('client', 'name profilePicture rating phone');

  // 2. LOGIQUE DE DISPATCH (C'est ici que tout change)
  if (driverId) {
    // Cas A : Commande directe à un chauffeur spécifique
    req.io.to(driverId.toString()).emit('new_ride_request', populatedRide);
  } else {
    // Cas B : Recherche des chauffeurs PROCHES (Rayon 5 KM)
    console.log(`📡 Recherche chauffeurs autour de [${pickupLocation.coordinates[0]}, ${pickupLocation.coordinates[1]}]`);

    const nearbyDrivers = await User.find({
      role: 'driver',
      isAvailable: true, // Doit être en ligne
      // driverStatus: 'approved', // Décommente si tu veux filtrer les chauffeurs validés uniquement
      currentLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: pickupLocation.coordinates // [Lng, Lat]
          },
          $maxDistance: 5000 // 5000 mètres = 5km
        }
      }
    });

    console.log(`🎯 ${nearbyDrivers.length} chauffeur(s) trouvé(s) dans le rayon.`);

    if (nearbyDrivers.length > 0) {
      // On notifie CHAQUE chauffeur trouvé individuellement
      nearbyDrivers.forEach(driver => {
        console.log(`📤 Envoi offre au chauffeur: ${driver.name} (${driver._id})`);
        req.io.to(driver._id.toString()).emit('new_ride_request', populatedRide);
      });
    } else {
      // Optionnel : Notifier le client qu'aucun chauffeur n'est dispo
      // req.io.to(req.user._id.toString()).emit('no_drivers_found');
    }
  }

  res.status(201).json(populatedRide);
});

// ... LE RESTE DES FONCTIONS (acceptRide, etc.) RESTE INCHANGÉ ...
// Je te les remets en version courte pour que le fichier soit valide si tu copies-colles

const acceptRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (ride) {
    if (ride.status === 'accepted' && ride.driver.toString() === req.user._id.toString()) {
       const existingRide = await Ride.findById(ride._id)
        .populate('driver', 'name profilePicture phone vehicleInfo rating')
        .populate('client', 'name profilePicture phone');
       return res.json(existingRide);
    }
    if (ride.status !== 'requested') {
      res.status(400); throw new Error('Cette course n\'est plus disponible');
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
  } else { res.status(404); throw new Error('Course non trouvée'); }
});

const declineRide = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const ride = await Ride.findById(req.params.id);
  if (ride) {
    ride.status = 'declined';
    ride.declineReason = reason;
    await ride.save();
    req.io.emit('rideDeclined', { rideId: ride._id, reason });
    res.json({ message: 'Course refusée' });
  } else { res.status(404); throw new Error('Course non trouvée'); }
});

const startRide = asyncHandler(async (req, res) => {
  const ride = await Ride.findById(req.params.id);
  if (ride) {
    ride.status = 'ongoing';
    ride.startedAt = Date.now();
    await ride.save();
    const fullRide = await Ride.findById(ride._id)
      .populate('driver', 'name profilePicture phone vehicleInfo rating')
      .populate('client', 'name profilePicture phone');
    req.io.emit('rideStarted', fullRide);
    res.json(fullRide);
  } else { res.status(404); throw new Error('Course non trouvée'); }
});

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
  } else { res.status(404); throw new Error('Course non trouvée'); }
});

const getRideHistory = asyncHandler(async (req, res) => {
  const rides = await Ride.find({ $or: [{ client: req.user._id }, { driver: req.user._id }] })
  .populate('driver', 'name vehicleInfo').populate('client', 'name').sort({ createdAt: -1 });
  res.json(rides);
});

export { createRide, acceptRide, declineRide, startRide, completeRide, getRideHistory };