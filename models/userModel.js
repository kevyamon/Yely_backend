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
      trim: true,      // Supprime les espaces avant/après
      lowercase: true, // Force tout en minuscule (Kevin@Test.com -> kevin@test.com)
    },
    phone: {
      type: String,
      required: true, 
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'rider', 'driver', 'admin', 'superadmin'],
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
    documents: {
      idCard: String,
      driverLicense: String,
      vehicleRegistration: String,
      insurance: String,
      photo: String,
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
        type: [Number],
        default: [0, 0],
      },
    },
    fcmToken: {
      type: String,
    },
    subscription: {
      plan: {
        type: String,
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

userSchema.index({ currentLocation: '2dsphere' });

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.model('User', userSchema);

export default User;