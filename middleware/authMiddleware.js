// backend/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import asyncHandler from './asyncHandler.js';
import User from '../models/userModel.js';

// Protect routes
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // On cherche le token dans le Header OU dans les Cookies
  token = req.cookies.jwt; // Priorité Cookie

  // Si pas de cookie, on regarde le Header (Authorization: Bearer xyz...)
  if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      // DEBUG : On affiche ce qu'on essaie de vérifier (Regarde les Logs Render !)
      console.log('🔍 MIDDLEWARE: Token reçu ->', token.substring(0, 15) + '...');
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      console.log('✅ MIDDLEWARE: Token décodé -> ID:', decoded.userId);

      req.user = await User.findById(decoded.userId).select('-password');

      if (!req.user) {
        console.error('❌ MIDDLEWARE: Utilisateur introuvable en base avec cet ID !');
        res.status(401);
        throw new Error('Non autorisé, utilisateur introuvable');
      }

      console.log('🚪 MIDDLEWARE: Accès autorisé pour', req.user.name);
      next();
    } catch (error) {
      console.error('❌ MIDDLEWARE ERROR:', error.message);
      res.status(401);
      throw new Error('Non autorisé, token invalide');
    }
  } else {
    console.error('❌ MIDDLEWARE: Aucun token trouvé (Ni cookie, ni header)');
    res.status(401);
    throw new Error('Non autorisé, pas de token');
  }
});

// Admin middleware
const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(401);
    throw new Error('Non autorisé en tant qu\'admin');
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