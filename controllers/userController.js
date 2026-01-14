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
    generateToken(res, user._id);
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      driverId: user.driverId,
      wallet: user.wallet,
    });
  } else {
    res.status(401);
    throw new Error('Email ou mot de passe incorrect');
  }
});

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  // On récupère aussi les infos véhicule (vehicleInfo) si envoyées
  const { name, email, phone, password, role, vehicleInfo } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('Cet utilisateur existe déjà');
  }

  // --- LOGIQUE SPÉCIALE CHAUFFEUR ---
  let driverId = null;
  let initialWallet = 0;
  let finalVehicleInfo = {};

  // Si l'utilisateur a COCHÉ "Chauffeur" sur le site (role === 'driver')
  if (role === 'driver') {
    // 1. Génération ID TAXI (BORIS + 0909)
    const firstName = name.trim().split(' ')[0].toUpperCase(); // Prend le premier nom en MAJ
    const cleanPhone = phone.replace(/\D/g, ''); // Garde que les chiffres
    const phonePrefix = cleanPhone.substring(0, 4); // Les 4 premiers chiffres
    driverId = `${firstName}${phonePrefix}`;

    // Gestion collision ID (très rare)
    const idExists = await User.findOne({ driverId });
    if (idExists) {
      driverId += Math.floor(Math.random() * 10);
    }

    // 2. Cadeau de bienvenue
    initialWallet = 500; 

    // 3. Enregistrement des infos voiture (si fournies)
    if (vehicleInfo) {
      finalVehicleInfo = vehicleInfo;
    }
  }

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: role || 'rider', // Si rien coché, c'est un client
    driverId,
    vehicleInfo: finalVehicleInfo,
    wallet: initialWallet
  });

  if (user) {
    generateToken(res, user._id);
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      driverId: user.driverId,
      wallet: user.wallet,
    });
  } else {
    res.status(400);
    throw new Error('Données invalides');
  }
});

// @desc    Logout user
// @route   POST /api/users/logout
const logoutUser = asyncHandler(async (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Déconnexion réussie' });
});

// @desc    Get user profile
// @route   GET /api/users/profile
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      driverId: user.driverId,
      wallet: user.wallet,
    });
  } else {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    if (req.body.password) {
      user.password = req.body.password;
    }
    // Mise à jour possible des infos véhicule
    if (req.body.vehicleInfo && user.role === 'driver') {
        user.vehicleInfo = req.body.vehicleInfo;
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      driverId: updatedUser.driverId,
      wallet: updatedUser.wallet,
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