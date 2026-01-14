// models/userModel.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ['rider', 'driver', 'admin'],
      default: 'rider', // Par défaut c'est un client
    },
    
    // --- INFOS SPÉCIFIQUES CHAUFFEUR ---
    driverId: {
      type: String,
      unique: true,
      sparse: true, // Technique : Permet aux clients d'avoir ce champ vide sans bug
      trim: true,
    },
    // Nouveauté : On prépare le terrain pour les infos voiture
    vehicleInfo: {
      model: { type: String }, // Ex: Toyota Corolla
      plate: { type: String }, // Ex: 1234 XY 01
      color: { type: String }, // Ex: Jaune
    },
    lastDailyFeePaid: {
      type: Date,
      default: null,
    },
    wallet: {
      type: Number,
      default: 0,
    },
    // ------------------------------------

    rating: {
      type: Number,
      default: 5,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    currentRide: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      default: null,
    },
    socketId: {
      type: String,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [Longitude, Latitude]
      },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

module.exports = User;