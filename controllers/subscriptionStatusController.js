 // controllers/subscriptionStatusController.js

import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/userModel.js';

const getSubscriptionStatus = asyncHandler(async (req, res) => {
  if (req.user.role !== 'driver') {
    res.status(403);
    throw new Error('Réservé aux chauffeurs');
  }

  const driver = await User.findById(req.user._id).select('subscription');

  const hoursRemaining = Math.max(0, Math.floor(driver.subscription.remainingHours));
  const daysRemaining = Math.floor(hoursRemaining / 24);
  const hoursOnly = hoursRemaining % 24;

  res.json({
    status: driver.subscription.status,
    plan: driver.subscription.plan,
    remainingHours: hoursRemaining,
    remainingDays: daysRemaining,
    remainingHoursOnly: hoursOnly,
    formattedTime: `${daysRemaining}j ${hoursOnly}h`,
    isExpired: driver.subscription.status === 'inactive',
    activatedAt: driver.subscription.activatedAt
  });
});

export { getSubscriptionStatus };
