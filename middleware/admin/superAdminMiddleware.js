// middleware/admin/superAdminMiddleware.js

import User from '../../models/userModel.js';

const superAdminOnly = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401);
      throw new Error('Vous devez être connecté');
    }

    const superAdminEmail = process.env.ADMIN_MAIL;

    if (req.user.email !== superAdminEmail) {
      res.status(403);
      throw new Error('Accès réservé au SuperAdmin uniquement');
    }

    if (req.user.role !== 'superAdmin') {
      res.status(403);
      throw new Error('Privilèges insuffisants');
    }

    next();

  } catch (error) {
    res.status(403).json({ 
      message: error.message || 'Accès refusé' 
    });
  }
};

const adminOnly = async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401);
      throw new Error('Vous devez être connecté');
    }

    if (req.user.role !== 'admin' && req.user.role !== 'superAdmin') {
      res.status(403);
      throw new Error('Accès réservé aux administrateurs');
    }

    next();

  } catch (error) {
    res.status(403).json({ 
      message: error.message || 'Accès refusé' 
    });
  }
};

export { superAdminOnly, adminOnly };  
