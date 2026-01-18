// backend/controllers/userController.js
import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';

// @desc    Auth user & get token
// @route   POST /api/users/auth
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { emailOrPhone, password } = req.body;

  // Recherche par Email OU Téléphone
  const user = await User.findOne({
    $or: [{ email: emailOrPhone }, { phone: emailOrPhone }],
  });

  if (user && (await user.matchPassword(password))) {
    generateToken(res, user._id);
    
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      driverId: user.driverId, 
      wallet: user.wallet,
      subscription: user.subscription, // <--- AJOUT CRUCIAL (État Abonnement)
    });
  } else {
    res.status(401);
    throw new Error('Email/Téléphone ou mot de passe invalide');
  }
});

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role, vehicleModel, vehiclePlate, vehicleColor } = req.body;

  const userExists = await User.findOne({ $or: [{ email }, { phone }] });
  if (userExists) {
    res.status(400);
    throw new Error('Un utilisateur avec cet email ou ce numéro existe déjà');
  }

  // --- LOGIQUE SPÉCIALE CHAUFFEUR (Ton code) ---
  let driverId = null;
  let vehicleInfo = null;
  let initialWallet = 0;

  if (role === 'driver') {
    // 1. GÉNÉRATION AUTOMATIQUE DU ID TAXI
    const namePart = name.trim().replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
    const phonePart = phone.replace(/\D/g, '').substring(0, 3);
    driverId = `${namePart}${phonePart}`;

    // Sécurité collision
    const idExists = await User.findOne({ driverId });
    if (idExists) {
      driverId += Math.floor(Math.random() * 10);
    }

    // 2. STOCKAGE DES INFOS VÉHICULE
    vehicleInfo = {
      model: vehicleModel,
      plate: vehiclePlate,
      color: vehicleColor
    };

    // 3. BONUS DE BIENVENUE
    initialWallet = 500; 
  }

  // CRÉATION DE L'UTILISATEUR
  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: role || 'rider',
    driverId,
    vehicleInfo,
    wallet: initialWallet,
    // Note: subscription est créé automatiquement par le "default" du Model
  });

  if (user) {
    generateToken(res, user._id);
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      driverId: user.driverId,
      wallet: user.wallet,
      subscription: user.subscription, // <--- AJOUT CRUCIAL
    });
  } else {
    res.status(400);
    throw new Error('Données utilisateur invalides');
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/users/logout
// @access  Private
const logoutUser = (req, res) => {
  res.cookie('jwt', '', { httpOnly: true, expires: new Date(0) });
  res.status(200).json({ message: 'Déconnecté avec succès' });
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
      phone: user.phone,
      role: user.role,
      driverId: user.driverId,
      wallet: user.wallet,
      vehicleInfo: user.vehicleInfo,
      subscription: user.subscription, // <--- AJOUT CRUCIAL
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
    user.phone = req.body.phone || user.phone;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      driverId: updatedUser.driverId,
      wallet: updatedUser.wallet,
      subscription: updatedUser.subscription, // <--- AJOUT CRUCIAL
    });
  } else {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }
});

export { authUser, registerUser, logoutUser, getUserProfile, updateUserProfile };