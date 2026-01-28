// models/userModel.js

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
    
    driverId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    vehicleInfo: {
      model: { type: String },
      plate: { type: String },
      color: { type: String },
    },
    
    subscription: {
      status: { 
        type: String, 
        enum: ['active', 'inactive'],
        default: 'inactive' 
      },
      plan: { 
        type: String, 
        enum: ['WEEKLY', 'MONTHLY', 'none'], 
        default: 'none' 
      },
      remainingHours: { type: Number, default: 0 },
      totalHours: { type: Number, default: 0 },
      lastCheckTime: { type: Date, default: null },
      activatedAt: { type: Date, default: null }
    },

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
    
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], index: '2dsphere' },
    },
    
    pushSubscriptions: [pushSubscriptionSchema],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

// 🔥 LA CORRECTION EST ICI 🔥
userSchema.pre('save', async function (next) {
  // AVANT (BUG) : if (!this.isModified('password')) { next(); } 
  // -> Le code continuait à s'exécuter et re-hachait le mot de passe !

  // MAINTENANT (CORRIGÉ) : on ajoute 'return'
  if (!this.isModified('password')) { 
    return next(); 
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;