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
    role: {
      type: String,
      enum: ['user', 'driver', 'admin', 'superAdmin'],
      default: 'user',
    },
    isAdmin: {
      type: Boolean,
      required: true,
      default: false,
    },
    isVerified: { // Pour les admins/drivers validés par SuperAdmin
      type: Boolean,
      default: false
    },
    driverStatus: { // status spécifique aux chauffeurs
      type: String,
      enum: ['pending', 'approved', 'rejected', 'none'],
      default: 'none'
    },
    documents: { // Documents du chauffeur
      license: String,
      registration: String,
      insurance: String,
      vehiclePhotos: [String]
    },
    subscription: {
        status: { type: String, enum: ['active', 'inactive', 'expired'], default: 'inactive' },
        plan: { type: String, enum: ['jour', 'semaine', 'mois'], default: null },
        expiresAt: { type: Date, default: null },
        lastPaymentDate: { type: Date, default: null }
    }
  },
  {
    timestamps: true,
  }
);

// VACCIN CONTRE LE DOUBLE HACHAGE
userSchema.pre('save', async function (next) {
  // Si le mot de passe n'a pas été modifié, on ne fait rien !
  if (!this.isModified('password')) {
    return next();
  }

  // Sinon, on crypte
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;