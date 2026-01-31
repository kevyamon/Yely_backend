// backend/utils/generateToken.js
import jwt from 'jsonwebtoken';

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

  // Configuration du Cookie (Sécurité)
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development', // Secure en prod (https)
    sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'none', // 'none' est CRUCIAL pour le cross-site sur Render
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
  });

  // IMPORTANT : On retourne le token pour pouvoir l'envoyer dans le JSON
  return token;
};

export default generateToken;