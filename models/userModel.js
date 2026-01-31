// backend/models/userModel.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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
      enum: ['user', 'driver', 'admin', 'superadmin'],
      default: 'user',
    },
    // Champs spécifiques aux chauffeurs
    driverStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending', 
    },
    vehicleType: {
      type: String,
      enum: ['Standard', 'Premium', 'Van', 'Moto'],
    },
    licensePlate: {
      type: String,
    },
    // Pour gérer les documents des chauffeurs (URL Cloudinary)
    documents: {
      idCard: String,
      driverLicense: String,
      vehicleRegistration: String,
      insurance: String,
      photo: String, // Photo de profil/véhicule
    },
    isAvailable: {
      type: Boolean,
      default: false,
    },
    currentLocation: {
      type: {
        type: String,
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
    fcmToken: {
      type: String,
    },
    subscription: {
      plan: {
        type: String, // 'standard', 'gold', 'platinum'
        default: null
      },
      startDate: Date,
      endDate: Date,
      isActive: {
        type: Boolean,
        default: false
      },
      remainingRides: {
        type: Number,
        default: 0
      }
    }
  },
  {
    timestamps: true,
  }
);

// Index géospatial pour la recherche de chauffeurs à proximité
userSchema.index({ currentLocation: '2dsphere' });

// Méthode pour vérifier le mot de passe
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Middleware pour hacher le mot de passe avant de sauvegarder
userSchema.pre('save', async function (next) {
  // CORRECTION CRITIQUE : Si le mot de passe n'est pas modifié, on SORT IMMÉDIATEMENT.
  if (!this.isModified('password')) {
    return next();
  }

  // Sinon, on génère un sel et on hache
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', userSchema);

export default User;