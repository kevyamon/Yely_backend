// backend/controllers/userController.js
import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';

// @desc    Auth user & get token
// @route   POST /api/users/auth
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  console.log('--- 🕵️ TENTATIVE DE CONNEXION (DEBUG) ---');
  console.log('1. Body reçu du Frontend:', req.body);

  const { email, password, fcmToken } = req.body;

  let user;
  
  // Normalisation de l'entrée (Email ou Téléphone ?)
  if (email && email.includes('@')) {
    const emailClean = email.toLowerCase().trim();
    console.log(`2. Recherche par EMAIL: "${emailClean}"`);
    user = await User.findOne({ email: emailClean });
  } else if (email) {
    // Cas où l'utilisateur a mis son téléphone dans le champ email
    const phoneClean = email.trim();
    console.log(`2. Recherche par TÉLÉPHONE (via champ email): "${phoneClean}"`);
    user = await User.findOne({ phone: phoneClean });
  } else if (req.body.phone) {
    // Cas où le frontend envoie explicitement un champ "phone"
    const phoneClean = req.body.phone.trim();
    console.log(`2. Recherche par TÉLÉPHONE DIRECT: "${phoneClean}"`);
    user = await User.findOne({ phone: phoneClean });
  }

  // LOG DU RÉSULTAT DE LA RECHERCHE
  if (!user) {
    console.log('❌ UTILISATEUR NON TROUVÉ en base de données.');
    res.status(401);
    throw new Error('Compte inexistant');
  } else {
    console.log('✅ UTILISATEUR TROUVÉ:', user.email);
    console.log('🔑 Hash en base (début):', user.password.substring(0, 10) + '...');
  }

  // TENTATIVE DE COMPARAISON MOT DE PASSE
  console.log('3. Vérification du mot de passe...');
  const isMatch = await user.matchPassword(password);
  console.log('📝 Résultat comparaison:', isMatch ? '✅ SUCCÈS' : '❌ ÉCHEC (Mauvais mot de passe)');

  if (isMatch) {
    // Mise à jour Token FCM
    if (fcmToken) {
      console.log('4. Mise à jour FCM Token');
      user.fcmToken = fcmToken;
      await user.save();
    }

    const token = generateToken(res, user._id);
    console.log('5. Génération Token réussie. Envoi réponse JSON.');

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
      token: token 
    });
  } else {
    res.status(401);
    throw new Error('Mot de passe incorrect');
  }
});

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  
  console.log('--- 📝 TENTATIVE INSCRIPTION ---');
  console.log('Données:', { name, email, phone, role });

  const normalizedEmail = email ? email.toLowerCase().trim() : null;
  const normalizedPhone = phone ? phone.trim() : null;

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
    console.log('✅ Inscription réussie. ID:', user._id);
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

// ... LE RESTE DU FICHIER RESTE STRICTEMENT IDENTIQUE ...
// Je te remets la suite pour ne pas casser le fichier en copiant

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