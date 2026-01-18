// backend/models/rideModel.js
import mongoose from 'mongoose';

const rideSchema = mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    pickupLocation: {
      address: String,
      coordinates: { 
        type: [Number], // [Longitude, Latitude]
        required: true 
      },
    },
    dropoffLocation: {
      address: String,
      coordinates: { 
        type: [Number], 
        required: true 
      },
    },
    status: {
      type: String,
      enum: ['requested', 'accepted', 'ongoing', 'completed', 'cancelled', 'declined'],
      default: 'requested',
    },
    price: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'yely_credit'],
      required: true,
    },
    // Stockage du motif si le chauffeur refuse
    declineReason: {
      type: String,
    },
    // Horaires pour le calcul de précision
    acceptedAt: Date,
    startedAt: Date, // "Client à bord"
    completedAt: Date,
  },
  { timestamps: true }
);

// Index pour la recherche de proximité
rideSchema.index({ "pickupLocation.coordinates": "2dsphere" });

const Ride = mongoose.model('Ride', rideSchema);
export default Ride;