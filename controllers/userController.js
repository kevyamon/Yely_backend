// controllers/userController.js
import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';

// @desc    Authentifier l'utilisateur & récupérer le token
// @route   POST /api/users/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { emailOrPhone, password } = req.body;

  // On cherche l'utilisateur soit par email, soit par téléphone (Ultra flexible !)
  const user = await User.findOne({
    $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
  });

  if (user && (await user.matchPassword(password))) {
    // Génération du cookie sécurisé (La Forteresse)
    generateToken(res, user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      wallet: user.wallet, // On renvoie le solde Yély Crédit
    });
  } else {
    res.status(401);
    throw new Error('Email/Téléphone ou mot de passe invalide');
  }
});

// @desc    Enregistrer un nouvel utilisateur
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  // Vérification de sécurité : l'utilisateur existe-t-il déjà ?
  const userExists = await User.findOne({ $or: [{ email }, { phone }] });

  if (userExists) {
    res.status(400);
    throw new Error('Un utilisateur avec cet email ou ce numéro existe déjà');
  }

  // Création de l'utilisateur (Le mot de passe sera haché automatiquement par le modèle)
  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: role || 'rider', // Par défaut c'est un client
  });

  if (user) {
    generateToken(res, user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      wallet: user.wallet,
    });
  } else {
    res.status(400);
    throw new Error('Données utilisateur invalides');
  }
});

// @desc    Déconnecter l'utilisateur / Effacer le cookie
// @route   POST /api/users/logout
// @access  Public
const logoutUser = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Déconnecté avec succès' });
};

// @desc    Obtenir le profil de l'utilisateur connecté
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      wallet: user.wallet,
    });
  } else {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }
});

export { authUser, registerUser, logoutUser, getUserProfile };