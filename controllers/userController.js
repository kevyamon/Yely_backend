// controllers/userController.js
import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';

// @desc    Inscription
// @route   POST /api/users/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !phone || !password) {
    res.status(400);
    throw new Error('Tous les champs sont requis');
  }

  const userExists = await User.findOne({ $or: [{ email }, { phone }] });
  if (userExists) {
    res.status(400);
    throw new Error('Un compte avec cet email ou téléphone existe déjà');
  }

  // 🔥 DÉTECTION À L'INSCRIPTION
  const isSuperAdmin = email === process.env.ADMIN_MAIL;
  const finalRole = isSuperAdmin ? 'superAdmin' : (role || 'rider');

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: finalRole,
  });

  if (user) {
    const token = generateToken(res, user._id);
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      profilePicture: user.profilePicture,
      wallet: user.wallet,
      subscription: user.subscription,
      token,
    });

    if (isSuperAdmin) {
      console.log('👑 SUPERADMIN CRÉÉ (Inscription):', user.email);
    }
  } else {
    res.status(400);
    throw new Error('Données utilisateur invalides');
  }
});

// @desc    Connexion
// @route   POST /api/users/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    
    // 🔥 AUTO-PROMOTION SÉCURISÉE (CORRECTION DU BUG)
    // Si c'est l'email du chef MAIS qu'il n'a pas le rôle
    if (email === process.env.ADMIN_MAIL && user.role !== 'superAdmin') {
      
      // ATTENTION : On utilise updateOne ici au lieu de save()
      // Cela force la modification en base de données SANS déclencher le cryptage du mot de passe
      await User.updateOne({ _id: user._id }, { $set: { role: 'superAdmin' } });
      
      // On met à jour l'objet local pour que le token et la réponse soient corrects tout de suite
      user.role = 'superAdmin';
      
      console.log(`👑 AUTO-PROMOTION: ${user.name} est passé SuperAdmin à la connexion (Mise à jour sans risque).`);
    }

    // On génère le token avec le rôle (potentiellement mis à jour ci-dessus)
    const token = generateToken(res, user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role, 
      profilePicture: user.profilePicture,
      wallet: user.wallet,
      subscription: user.subscription,
      driverId: user.driverId,
      vehicleInfo: user.vehicleInfo,
      token,
    });
  } else {
    res.status(401);
    throw new Error('Email ou mot de passe incorrect');
  }
});

// @desc    Déconnexion
// @route   POST /api/users/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });

  res.status(200).json({ message: 'Déconnexion réussie' });
});

// @desc    Récupérer le profil
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');

  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }
});

// @desc    Mettre à jour le profil
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

    if (req.body.vehicleInfo) {
      user.vehicleInfo = req.body.vehicleInfo;
    }

    // Ici, save() est correct car si le mot de passe change, on VEUT qu'il soit hashé.
    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      profilePicture: updatedUser.profilePicture,
      wallet: updatedUser.wallet,
      subscription: updatedUser.subscription,
    });
  } else {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
};