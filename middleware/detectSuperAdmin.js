// middleware/detectSuperAdmin.js
import User from '../models/userModel.js';

const detectSuperAdmin = async (req, res, next) => {
  // On vérifie d'abord si l'utilisateur est connecté et si c'est l'email admin
  if (req.user && req.user.email === process.env.ADMIN_MAIL) {
     
     // Si le rôle n'est pas encore bon en mémoire
     if (req.user.role !== 'superAdmin') {
         
         // 1. Mise à jour en Base de Données (SANS toucher au mot de passe via updateOne)
         await User.updateOne(
            { _id: req.user._id },
            { $set: { role: 'superAdmin' } }
         );

         // 2. Mise à jour de l'objet en mémoire pour la suite de la requête
         req.user.role = 'superAdmin';
         
         console.log('👑 Middleware: Auto-promotion SuperAdmin effectuée (Sécurisée).');
     }
  }
  next();
};

export default detectSuperAdmin;