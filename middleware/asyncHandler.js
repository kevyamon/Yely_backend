// middleware/asyncHandler.js

// C'est comme un tapis roulant : si une action tombe en panne, le tapis l'envoie direct au gardien des erreurs
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;