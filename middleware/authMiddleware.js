// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import asyncHandler from './asyncHandler.js';
import User from '../models/userModel.js';

// Protect routes
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Vérification Cookie (Priorité Sécurité Web)
  token = req.cookies.jwt;

  // 2. Vérification Header (Priorité Compatibilité Mobile/Render)
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // On exclut le mot de passe pour la sécurité
      req.user = await User.findById(decoded.userId).select('-password');

      if (!req.user) {
        res.status(401);
        throw new Error('Utilisateur introuvable');
      }

      next();
    } catch (error) {
      console.error('Erreur token:', error);
      res.status(401);
      throw new Error('Token invalide ou expiré');
    }
  } else {
    res.status(401);
    throw new Error('Non autorisé, aucun token trouvé');
  }
});

// Admin middleware (CORRIGÉ : Vérifie le Rôle, pas isAdmin)
const admin = (req, res, next) => {
  // On accepte 'admin' OU 'superAdmin'
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superAdmin')) {
    next();
  } else {
    res.status(401);
    throw new Error('Espace réservé aux administrateurs');
  }
};

// Driver middleware (CORRIGÉ)
const driverOnly = (req, res, next) => {
  if (req.user && req.user.role === 'driver') {
    next();
  } else {
    res.status(401);
    throw new Error('Espace réservé aux chauffeurs');
  }
};

export { protect, admin, driverOnly };