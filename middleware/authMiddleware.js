// backend/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import asyncHandler from './asyncHandler.js';
import User from '../models/userModel.js';

// Protect routes
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Vérification Cookie (Priorité Sécurité)
  token = req.cookies.jwt;

  // 2. Vérification Header (Priorité Compatibilité Render/Mobile)
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = await User.findById(decoded.userId).select('-password');

      if (!req.user) {
        res.status(401);
        throw new Error('Utilisateur introuvable');
      }

      next();
    } catch (error) {
      res.status(401);
      throw new Error('Token invalide ou expiré');
    }
  } else {
    res.status(401);
    throw new Error('Non autorisé, aucun token trouvé');
  }
});

// Admin middleware
const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(401);
    throw new Error('Espace réservé aux administrateurs');
  }
};

// Driver middleware
const driverOnly = (req, res, next) => {
  if (req.user && req.user.role === 'driver') {
    next();
  } else {
    res.status(401);
    throw new Error('Espace réservé aux chauffeurs');
  }
};

export { protect, admin, driverOnly };