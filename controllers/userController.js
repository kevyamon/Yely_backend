// backend/controllers/userController.js
import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';

// @desc    Auth user & get token
// @route   POST /api/users/auth
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password, fcmToken } = req.body;

  // 1. Trouver l'utilisateur
  const user = await User.findOne({ email });

  // 2. Vérifier si l'utilisateur existe ET si le mot de passe correspond
  if (user && (await user.matchPassword(password))) {
    
    // 3. Mise à jour propre du FCM Token si présent
    if (fcmToken) {
      user.fcmToken = fcmToken;
      // Le middleware pre('save') dans le modèle va détecter que 'password' n'a pas changé
      // et ne va PAS le re-hacher grâce au fix "return next()".
      await user.save();
    }

    // 4. Générer le token
    generateToken(res, user._id);

    // 5. Renvoyer les infos (SANS le mot de passe)
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      driverStatus: user.driverStatus,
      isAvailable: user.isAvailable,
      subscription: user.subscription,
      documents: user.documents // Utile pour savoir s'il a déjà uploadé ses docs
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
  const { name, email, password, role } = req.body;

  // 1. Vérification existence
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('Un utilisateur avec cet email existe déjà');
  }

  // 2. Création avec initialisation FORCÉE de la géolocalisation
  // C'est ici que se trouve le FIX pour l'erreur "Can't extract geo keys"
  const user = await User.create({
    name,
    email,
    password, 
    role: role || 'user', 
    currentLocation: {
      type: 'Point',
      coordinates: [0, 0] // Initialisation explicite pour satisfaire l'index 2dsphere
    }
  });

  if (user) {
    // 3. Génération Token immédiate
    generateToken(res, user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      driverStatus: user.driverStatus,
      subscription: user.subscription
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
      driverStatus: user.driverStatus,
      isAvailable: user.isAvailable,
      currentLocation: user.currentLocation,
      subscription: user.subscription,
      documents: user.documents
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
      // Le middleware pre('save') détectera le changement et hachera
    }

    // Mise à jour de la position
    if (req.body.latitude && req.body.longitude) {
      user.currentLocation = {
        type: 'Point',
        coordinates: [req.body.longitude, req.body.latitude],
      };
    }
    
    // Mise à jour de la disponibilité
    if (req.body.isAvailable !== undefined) {
      user.isAvailable = req.body.isAvailable;
    }
    
    // Mise à jour du token FCM
    if (req.body.fcmToken) {
      user.fcmToken = req.body.fcmToken;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      driverStatus: updatedUser.driverStatus,
      isAvailable: updatedUser.isAvailable,
      currentLocation: updatedUser.currentLocation,
      subscription: updatedUser.subscription
    });
  } else {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }
});

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    await user.deleteOne();
    res.json({ message: 'Utilisateur supprimé' });
  } else {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }
});

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.role = req.body.role || user.role;
    
    if (req.body.driverStatus) {
      user.driverStatus = req.body.driverStatus;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      driverStatus: updatedUser.driverStatus,
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
  getUsers,
  deleteUser,
  getUserById,
  updateUser,
};