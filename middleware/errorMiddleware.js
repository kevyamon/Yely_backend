// middleware/errorMiddleware.js

// Ce gardien attrape les gens qui se trompent de porte (URL inexistante)
const notFound = (req, res, next) => {
  const error = new Error(`Pas trouvé - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Ce gardien attrape toutes les erreurs du château pour les noter proprement
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Si MongoDB ne reconnaît pas un ID (C'est comme une erreur de matricule)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Ressource non trouvée (ID invalide)';
  }

  res.status(statusCode).json({
    message: message,
    // On ne montre les détails techniques que si on est en train de construire (dev)
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

export { notFound, errorHandler };