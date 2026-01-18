// backend/controllers/userController.js
import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';

// @desc    Auth user & get token
// @route   POST /api/users/auth
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { emailOrPhone, password } = req.body;

  // On cherche par email OU par téléphone
  const user = await User.findOne({
    $or: [{ email: emailOrPhone }, { phone: emailOrPhone }]
  });

  if (user && (await user.matchPassword(password))) {
    // On génère le token ET on le récupère dans une variable
    const token = generateToken(res, user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token: token, // <--- VOILÀ LA CLÉ MANQUANTE ! 🔑
      driverId: user.driverId,
      vehicleInfo: user.vehicleInfo,
      subscription: user.subscription // Pour le statut SaaS
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
  const { name, email, phone, password, role, vehicleModel, vehiclePlate, vehicleColor } = req.body;

  const userExists = await User.findOne({ $or: [{ email }, { phone }] });

  if (userExists) {
    res.status(400);
    throw new Error('Cet utilisateur existe déjà');
  }

  // Création conditionnelle selon le rôle
  let userData = { name, email, phone, password, role };

  // Si c'est un chauffeur, on ajoute ses infos véhicule
  if (role === 'driver') {
    userData.driverId = `DRI-${Date.now().toString().slice(-6)}`; // ID unique simple
    userData.vehicleInfo = {
      model: vehicleModel,
      plate: vehiclePlate,
      color: vehicleColor
    };
  }

  const user = await User.create(userData);

  if (user) {
    const token = generateToken(res, user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: token, // <--- ICI AUSSI !
      driverId: user.driverId,
      vehicleInfo: user.vehicleInfo
    });
  } else {
    res.status(400);
    throw new Error('Données invalides');
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
      driverId: user.driverId,
      vehicleInfo: user.vehicleInfo,
      subscription: user.subscription
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

    const updatedUser = await user.save();
    // Note: Pas besoin de renvoyer le token ici, il ne change pas
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      driverId: updatedUser.driverId,
      vehicleInfo: updatedUser.vehicleInfo,
    });
  } else {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }
});

export {
  authUser,
  registerUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
};