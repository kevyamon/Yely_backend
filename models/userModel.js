// models/userModel.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Schéma pour les notifications push (Pépite GTY Express)
const pushSubscriptionSchema = new mongoose.Schema({
  endpoint: { type: String, required: true },
  keys: {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
});

const userSchema = mongoose.Schema(
  {
    name: { 
      type: String, 
      required: [true, 'Le nom est obligatoire'],
      trim: true 
    },
    email: { 
      type: String, 
      required: [true, "L'email est obligatoire"], 
      unique: true,
      lowercase: true,
      trim: true 
    },
    phone: { 
      type: String, 
      required: [true, 'Le numéro de téléphone est obligatoire'], 
      unique: true,
      trim: true 
    },
    password: { 
      type: String, 
      required: [true, 'Le mot de passe est obligatoire'] 
    },
    profilePicture: { 
      type: String, 
      default: '' 
    },
    role: {
      type: String,
      required: true,
      enum: ['rider', 'driver', 'admin', 'superAdmin'],
      default: 'rider',
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'suspended', 'banned'],
      default: 'active',
    },
    // Logique Portefeuille & Yély Crédit
    wallet: {
      type: Number,
      default: 0,
      required: true,
    },
    // Logique Chauffeur (Tracking GPS)
    isOnline: {
      type: Boolean,
      default: false,
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [Longitude, Latitude]
        index: '2dsphere',
      },
    },
    // Sécurité et Notifications
    pushSubscriptions: [pushSubscriptionSchema],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

// Hachage automatique du mot de passe avant sauvegarde
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Méthode pour comparer les mots de passe
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;