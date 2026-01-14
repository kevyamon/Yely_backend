// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import asyncHandler from './asyncHandler.js';
import User from '../models/userModel.js';

// Protection générale (Vérifie si l'utilisateur est connecté et actif)
const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies.jwt;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.userId).select('-password');

      if (!req.user || req.user.status !== 'active') {
        res.status(403);
        throw new Error('Compte non autorisé ou suspendu.');
      }

      next();
    } catch (error) {
      res.status(401);
      throw new Error('Non autorisé, jeton invalide');
    }
  } else {
    res.status(401);
    throw new Error('Non autorisé, aucun jeton trouvé');
  }
});

// Gardien pour les administrateurs classiques
const admin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superAdmin')) {
    next();
  } else {
    res.status(401);
    throw new Error('Accès réservé aux administrateurs');
  }
};

// Gardien pour les chauffeurs
const driverOnly = (req, res, next) => {
  if (req.user && req.user.role === 'driver') {
    next();
  } else {
    res.status(401);
    throw new Error('Accès réservé aux chauffeurs');
  }
};

// Gardien SuperAdmin (Haute Direction) - Reconnaissance par Email
const superAdminOnly = (req, res, next) => {
  // On récupère les emails autorisés depuis la variable d'environnement (séparés par des virgules)
  const superAdminEmails = process.env.SUPERADMIN_MAIL 
    ? process.env.SUPERADMIN_MAIL.split(',').map(email => email.trim().toLowerCase()) 
    : [];

  if (req.user && (req.user.role === 'superAdmin' || superAdminEmails.includes(req.user.email.toLowerCase()))) {
    next();
  } else {
    res.status(401);
    throw new Error('Accès réservé à la Haute Direction (SuperAdmin)');
  }
};

export { protect, admin, driverOnly, superAdminOnly };