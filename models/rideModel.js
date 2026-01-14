// models/rideModel.js
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
    // Positions GPS (Format GeoJSON pour le mapping)
    pickupLocation: {
      address: String,
      coordinates: { type: [Number], required: true }, // [Longitude, Latitude]
    },
    dropoffLocation: {
      address: String,
      coordinates: { type: [Number], required: true },
    },
    status: {
      type: String,
      enum: ['requested', 'accepted', 'ongoing', 'completed', 'cancelled'],
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
    // Pour la logique "Zéro Monnaie"
    changeToCredit: {
      type: Number,
      default: 0,
    }
  },
  { timestamps: true }
);

const Ride = mongoose.model('Ride', rideSchema);
export default Ride;