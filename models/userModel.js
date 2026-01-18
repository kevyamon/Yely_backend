// backend/models/userModel.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const pushSubscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, required: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
});

const userSchema = mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    
    // --- ID TAXI & INFOS VOITURE ---
    driverId: {
      type: String,
      unique: true,
      sparse: true, // Permet aux clients d'avoir ce champ vide sans bug
      trim: true
    },
    vehicleInfo: {
      model: { type: String }, // ex: Toyota Corolla
      plate: { type: String }, // ex: 1234 XY 01
      color: { type: String }, // ex: Jaune
    },
    
    // --- NOUVEAU : GESTION ABONNEMENT (SaaS) ---
    // C'est ici qu'on gère le "Mur" (Payer pour travailler)
    subscription: {
      status: { 
        type: String, 
        enum: ['active', 'inactive', 'grace_period'], // grace_period = tolérance de quelques heures
        default: 'inactive' 
      },
      plan: { 
        type: String, 
        enum: ['daily', 'weekly', 'none'], 
        default: 'none' 
      },
      expiresAt: { type: Date, default: null }, // Date précise de la fin (ex: demain 14h30)
      lastPaymentDate: { type: Date, default: null }
    },
    // -------------------------------------------

    profilePicture: { type: String, default: '' },
    role: {
      type: String,
      enum: ['rider', 'driver', 'admin', 'superAdmin'],
      default: 'rider',
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'banned'],
      default: 'active',
    },
    wallet: { type: Number, default: 0 },
    isOnline: { type: Boolean, default: false },
    
    // Géolocalisation (Indispensable pour la map)
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], index: '2dsphere' }, // [Longitude, Latitude]
    },
    
    pushSubscriptions: [pushSubscriptionSchema],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

// Hachage du mot de passe
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) { next(); }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;