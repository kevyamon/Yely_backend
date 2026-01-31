// backend/controllers/userController.js
import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';

// @desc    Auth user & get token (Login)
// @route   POST /api/users/auth
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  // On récupère "email" du body, mais l'utilisateur peut avoir tapé son téléphone dedans
  const { email, password, fcmToken } = req.body;

  let user;

  // LOGIQUE INTELLIGENTE : Email ou Téléphone ?
  // Si ça contient un @, on traite comme un email
  if (email && email.includes('@')) {
    user = await User.findOne({ email: email.toLowerCase().trim() });
  } else {
    // Sinon, on essaie de trouver par téléphone
    // (On cherche tel quel, ou tu peux ajouter une logique de nettoyage si besoin)
    user = await User.findOne({ phone: email });
  }

  // Vérification
  if (user && (await user.matchPassword(password))) {
    
    // Mise à jour Token FCM (Notification)
    if (fcmToken) {
      user.fcmToken = fcmToken;
      // Le save ici ne re-hachera PAS le mot de passe grâce au fix du modèle
      await user.save();
    }

    generateToken(res, user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      driverStatus: user.driverStatus,
      isAvailable: user.isAvailable,
      subscription: user.subscription,
      documents: user.documents
    });
  } else {
    res.status(401);
    throw new Error('Email/Téléphone ou mot de passe incorrect');
  }
});

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  // Normalisation des entrées pour éviter les doublons "Kevin" vs "kevin"
  const normalizedEmail = email ? email.toLowerCase().trim() : null;
  const normalizedPhone = phone ? phone.trim() : null;

  // Vérification existence
  const userExists = await User.findOne({ 
    $or: [{ email: normalizedEmail }, { phone: normalizedPhone }] 
  });

  if (userExists) {
    res.status(400);
    const msg = userExists.email === normalizedEmail 
      ? 'Cet email est déjà utilisé.' 
      : 'Ce numéro de téléphone est déjà utilisé.';
    throw new Error(msg);
  }

  // Création
  const user = await User.create({
    name,
    email: normalizedEmail,
    phone: normalizedPhone,
    password, 
    role: role || 'user', 
    currentLocation: {
      type: 'Point',
      coordinates: [0, 0] 
    }
  });

  if (user) {
    generateToken(res, user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      driverStatus: user.driverStatus,
      subscription: user.subscription
    });
  } else {
    res.status(400);
    throw new Error('Données utilisateur invalides');
  }
});

// ... LE RESTE DU FICHIER NE CHANGE PAS (logoutUser, getUserProfile, etc.)
// Je remets logoutUser pour que le fichier soit copiable en entier sans erreur d'accolade

const logoutUser = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Déconnexion réussie' });
};

const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
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

const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;

    if (req.body.password) {
      user.password = req.body.password; 
    }

    if (req.body.latitude && req.body.longitude) {
      user.currentLocation = {
        type: 'Point',
        coordinates: [req.body.longitude, req.body.latitude],
      };
    }
    
    if (req.body.isAvailable !== undefined) {
      user.isAvailable = req.body.isAvailable;
    }
    
    if (req.body.fcmToken) {
      user.fcmToken = req.body.fcmToken;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
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

const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({});
  res.json(users);
});

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

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
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