// controllers/userController.js
const asyncHandler = require('../middleware/asyncHandler');
const User = require('../models/userModel');
const generateToken = require('../utils/generateToken');

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    
    // Mise à jour sécurisée sans déclencher les hooks pre-save (évite le double hachage)
    // Optionnel : Si tu veux mettre à jour la date de dernière connexion, fais-le ici via updateOne
    // await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

    generateToken(res, user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role, // Critique pour ton frontend
      isAdmin: user.isAdmin,
      driverStatus: user.driverStatus,
      subscription: user.subscription,
      isVerified: user.isVerified,
    });
  } else {
    res.status(401);
    throw new Error('Email ou mot de passe invalide');
  }
});

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('Cet utilisateur existe déjà');
  }

  // Sécurisation du rôle à la création : seul un admin peut créer un admin directement
  // Ici on force 'user' ou 'driver' par défaut si ce n'est pas spécifié
  const userRole = role === 'driver' ? 'driver' : 'user';

  const user = await User.create({
    name,
    email,
    password,
    role: userRole,
    driverStatus: userRole === 'driver' ? 'pending' : 'none'
  });

  if (user) {
    generateToken(res, user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
      driverStatus: user.driverStatus,
    });
  } else {
    res.status(400);
    throw new Error('Données utilisateur invalides');
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/users/logout
// @access  Public
const logoutUser = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Déconnexion réussie' });
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
      driverStatus: user.driverStatus,
      subscription: user.subscription,
      isVerified: user.isVerified
    });
  } else {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;

    if (req.body.password) {
      user.password = req.body.password;
    }

    // Gestion des mises à jour spécifiques (ex: drivers)
    if(req.body.license) user.documents = { ...user.documents, license: req.body.license };
    // ... autres champs si nécessaire

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isAdmin: updatedUser.isAdmin,
      driverStatus: updatedUser.driverStatus,
      subscription: updatedUser.subscription
    });
  } else {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }
});

module.exports = {
  authUser,
  registerUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
};