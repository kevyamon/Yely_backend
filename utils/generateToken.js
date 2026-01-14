// src/utils/generateToken.js
import jwt from 'jsonwebtoken';

/**
 * Génère un Token sécurisé et l'enregistre dans un Cookie "httpOnly"
 * @param {Object} res - La réponse Express
 * @param {String} userId - L'ID de l'utilisateur (Client ou Chauffeur)
 */
const generateToken = (res, userId) => {
  // Création de la clé cryptée avec l'ID de l'utilisateur
  // Elle expire dans 30 jours pour éviter de se reconnecter tout le temps
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

  // Configuration du cookie de sécurité (La Forteresse)
  res.cookie('jwt', token, {
    httpOnly: true, // Empêche les scripts pirates (XSS) de voler la clé
    secure: process.env.NODE_ENV !== 'development', // Active le HTTPS en production
    sameSite: 'strict', // Empêche les attaques de redirection (CSRF)
    maxAge: 30 * 24 * 60 * 60 * 1000, // Durée de vie de 30 jours en millisecondes
  });
};

export default generateToken;