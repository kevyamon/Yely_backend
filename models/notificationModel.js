// backend/models/notificationModel.js
import mongoose from 'mongoose';

const notificationSchema = mongoose.Schema(
  {
    // Type Mixed : Peut être un ObjectId (User précis) OU un String (ex: "driver", "admin")
    user: { 
      type: mongoose.Schema.Types.Mixed, 
      required: true,
      index: true // Crucial pour la performance
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['info', 'warning', 'success', 'error'], 
      default: 'info' 
    },
    data: { type: Object }, // Pour stocker des IDs de courses, etc.
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;