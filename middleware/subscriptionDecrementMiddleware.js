  
// middleware/subscriptionDecrementMiddleware.js

import User from '../models/userModel.js';

const decrementSubscriptionTime = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'driver') {
      return next();
    }

    const driver = await User.findById(req.user._id);

    if (!driver || driver.subscription.status !== 'active') {
      return next();
    }

    const now = new Date();
    const lastCheck = driver.subscription.lastCheckTime;

    if (!lastCheck) {
      driver.subscription.lastCheckTime = now;
      await driver.save();
      return next();
    }

    const elapsedMilliseconds = now - lastCheck;
    const elapsedHours = elapsedMilliseconds / (1000 * 60 * 60);

    driver.subscription.remainingHours -= elapsedHours;
    driver.subscription.lastCheckTime = now;

    if (driver.subscription.remainingHours <= 0) {
      driver.subscription.status = 'inactive';
      driver.subscription.remainingHours = 0;
      driver.subscription.plan = 'none';
      console.log(`⏰ Abonnement expiré : ${driver.name}`);
    }

    await driver.save();

    req.user.subscription = driver.subscription;

    next();

  } catch (error) {
    console.error('❌ Erreur décrémentation abonnement:', error);
    next();
  }
};

export { decrementSubscriptionTime };