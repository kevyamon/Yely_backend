// backend/controllers/userController.js
import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';

// @desc    Auth user & get token (Login Blindé)
// @route   POST /api/users/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password, fcmToken } = req.body;

  console.log('--- 🕵️ DEBUG LOGIN AVANCÉ ---');
  console.log('1. Donnée reçue (email/phone):', email);

  // Sécurité : Si le champ est vide
  if (!email || !password) {
    res.status(400);
    throw new Error('Veuillez fournir un email/téléphone et un mot de passe');
  }

  let user;
  const loginInput = email.trim(); // On enlève les espaces parasites début/fin

  // EST-CE UN EMAIL ? (Contient @)
  if (loginInput.includes('@')) {
    console.log(`2. Mode EMAIL détecté. Recherche flexible sur : "${loginInput}"`);
    
    // RECHERCHE PUISSANTE (Regex) : Insensible à la casse (i)
    // Cela trouvera "Moi@gmail.com" même si on envoie "moi@gmail.com"
    user = await User.findOne({ 
      email: { $regex: new RegExp(`^${loginInput}$`, 'i') } 
    });

  } else {
    // EST-CE UN TÉLÉPHONE ?
    console.log(`2. Mode TÉLÉPHONE détecté. Recherche sur : "${loginInput}"`);
    
    // Pour le téléphone, on cherche exactement ou on peut aussi utiliser un regex
    user = await User.findOne({ phone: loginInput });
  }

  // DIAGNOSTIC RÉSULTAT RECHERCHE
  if (!user) {
    console.log('❌ ÉCHEC RECHERCHE : Aucun utilisateur trouvé avec ces critères.');
    // Astuce de Debug : On affiche si un user proche existe (pour comprendre)
    if (loginInput.includes('@')) {
        const check = await User.findOne({ email: loginInput.toLowerCase() });
        console.log('   (Test lowercase strict:', check ? 'TROUVÉ' : 'NON TROUVÉ', ')');
    }
    res.status(401);
    throw new Error('Compte introuvable. Vérifiez l\'email ou le téléphone.');
  } 

  console.log(`✅ SUCCÈS : Utilisateur trouvé [${user.email}] (ID: ${user._id})`);

  // VÉRIFICATION MOT DE PASSE
  if (await user.matchPassword(password)) {
    console.log('🔓 Mot de passe valide. Connexion autorisée.');
    
    // Mise à jour FCM
    if (fcmToken) {
      user.fcmToken = fcmToken;
      await user.save();
    }

    const token = generateToken(res, user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      driverStatus: user.driverStatus,
      isAvailable: user.isAvailable,
      subscription: user.subscription,
      documents: user.documents,
      token: token // Indispensable pour le Front
    });

  } else {
    console.log('⛔ ÉCHEC MOT DE PASSE : Le hash ne correspond pas.');
    res.status(401);
    throw new Error('Mot de passe incorrect');
  }
});

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  // Normalisation stricte à l'inscription
  const normalizedEmail = email ? email.toLowerCase().trim() : null;
  const normalizedPhone = phone ? phone.trim() : null;

  // Vérification doublon Email OU Téléphone
  const query = [];
  if (normalizedEmail) query.push({ email: normalizedEmail });
  if (normalizedPhone) query.push({ phone: normalizedPhone });

  let userExists = null;
  if (query.length > 0) {
    userExists = await User.findOne({ $or: query });
  }

  if (userExists) {
    res.status(400);
    const msg = (normalizedEmail && userExists.email === normalizedEmail)
      ? 'Cet email est déjà utilisé.' 
      : 'Ce numéro de téléphone est déjà utilisé.';
    throw new Error(msg);
  }

  const user = await User.create({
    name,
    email: normalizedEmail, // On sauve propre
    phone: normalizedPhone,
    password, 
    role: role || 'user', 
    currentLocation: {
      type: 'Point',
      coordinates: [0, 0] 
    }
  });

  if (user) {
    const token = generateToken(res, user._id);
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      driverStatus: user.driverStatus,
      subscription: user.subscription,
      token: token
    });
  } else {
    res.status(400);
    throw new Error('Données utilisateur invalides');
  }
});

// ... LE RESTE NE CHANGE PAS ...
// Je te remets tout pour le copier-coller facile

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
    if (req.body.password) user.password = req.body.password; 
    if (req.body.latitude && req.body.longitude) {
      user.currentLocation = {
        type: 'Point',
        coordinates: [req.body.longitude, req.body.latitude],
      };
    }
    if (req.body.isAvailable !== undefined) user.isAvailable = req.body.isAvailable;
    if (req.body.fcmToken) user.fcmToken = req.body.fcmToken;

    const updatedUser = await user.save();
    const token = generateToken(res, updatedUser._id);

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      driverStatus: updatedUser.driverStatus,
      isAvailable: updatedUser.isAvailable,
      currentLocation: updatedUser.currentLocation,
      subscription: updatedUser.subscription,
      token: token
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
    if (req.body.driverStatus) user.driverStatus = req.body.driverStatus;
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