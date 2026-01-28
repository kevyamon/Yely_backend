// middleware/subscriptionDecrementMiddleware.js
import User from '../models/userModel.js';

const decrementSubscriptionTime = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'driver') {
      return next();
    }

    // Lecture simple des données
    const driver = await User.findById(req.user._id);

    if (!driver || driver.subscription.status !== 'active') {
      return next();
    }

    const now = new Date();
    const lastCheck = driver.subscription.lastCheckTime;

    // Cas 1 : Première vérification
    if (!lastCheck) {
      // UTILISATION DE UPDATEONE POUR ÉVITER LE HOOK 'SAVE' (CRITIQUE)
      await User.updateOne(
        { _id: driver._id },
        { $set: { 'subscription.lastCheckTime': now } }
      );
      
      // Mise à jour de l'objet en mémoire pour la suite de la requête
      driver.subscription.lastCheckTime = now;
      req.user.subscription = driver.subscription;
      return next();
    }

    // Cas 2 : Décrémentation normale
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

    // SAUVEGARDE SÉCURISÉE VIA UPDATEONE
    // Empêche formellement le déclenchement du hachage de mot de passe involontaire
    await User.updateOne(
      { _id: driver._id },
      { $set: { subscription: driver.subscription } }
    );

    req.user.subscription = driver.subscription;

    next();

  } catch (error) {
    console.error('❌ Erreur décrémentation abonnement:', error);
    next();
  }
};

export { decrementSubscriptionTime };