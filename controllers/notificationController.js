// backend/controllers/notificationController.js
import asyncHandler from '../middleware/asyncHandler.js';
import Notification from '../models/notificationModel.js';

// @desc    Récupérer les notifications (Logique Hybride)
// @route   GET /api/notifications
// @access  Private
const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role; // 'admin', 'driver', 'rider'

  const query = {
    $or: [
      { user: userId },      // Notifs personnelles
      { user: userRole }     // Notifs de groupe
    ]
  };

  // Tri par date décroissante
  const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(50);

  res.json(notifications);
});

// @desc    Tout marquer comme lu
// @route   PUT /api/notifications/mark-read
// @access  Private
const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;

  await Notification.updateMany(
    { 
      $or: [{ user: userId }, { user: userRole }],
      isRead: false 
    },
    { $set: { isRead: true } }
  );

  res.json({ message: 'Toutes les notifications marquées comme lues' });
});

export { getNotifications, markAllAsRead };