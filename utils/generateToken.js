// backend/utils/generateToken.js
import jwt from 'jsonwebtoken';

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

  // On configure le Cookie HTTP-Only (Sécurité maximale)
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development', // Secure en prod (Render)
    sameSite: 'strict', // Protection CSRF
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
  });

  // CRUCIAL : On RETOURNE le token pour pouvoir l'envoyer aussi en JSON !
  return token; 
};

export default generateToken;