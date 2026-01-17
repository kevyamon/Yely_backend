// controllers/userController.js
import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';

// ... (Garde la fonction authUser telle quelle) ...
const authUser = asyncHandler(async (req, res) => {
  const { emailOrPhone, password } = req.body;
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
      driverId: user.driverId, // On renvoie l'ID Taxi au login !
      wallet: user.wallet,
    });
  } else {
    res.status(401);
    throw new Error('Email/Téléphone ou mot de passe invalide');
  }
});

// --- MODIFICATION MAJEURE ICI ---
const registerUser = asyncHandler(async (req, res) => {
  // On récupère aussi les infos véhicule envoyées par le Frontend
  const { name, email, phone, password, role, vehicleModel, vehiclePlate, vehicleColor } = req.body;

  const userExists = await User.findOne({ $or: [{ email }, { phone }] });
  if (userExists) {
    res.status(400);
    throw new Error('Un utilisateur avec cet email ou ce numéro existe déjà');
  }

  // PRÉPARATION DES DONNÉES SPÉCIALES CHAUFFEUR
  let driverId = null;
  let vehicleInfo = null;
  let initialWallet = 0;

  if (role === 'driver') {
    // 1. GÉNÉRATION AUTOMATIQUE DU ID TAXI (Immuable)
    // Prend les 3 premières lettres du nom (ex: KEVY -> KEV)
    const namePart = name.trim().replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
    
    // Prend les 3 premiers chiffres du numéro (ex: 0748... -> 074)
    const phonePart = phone.replace(/\D/g, '').substring(0, 3);
    
    // Résultat : KEV074
    driverId = `${namePart}${phonePart}`;

    // Sécurité collision (Si KEV074 existe déjà, on ajoute un chiffre aléatoire)
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
    driverId,       // Enregistré ici !
    vehicleInfo,    // Enregistré ici !
    wallet: initialWallet
  });

  if (user) {
    generateToken(res, user._id);
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      driverId: user.driverId, // Le frontend reçoit le nouvel ID tout chaud
      wallet: user.wallet,
    });
  } else {
    res.status(400);
    throw new Error('Données utilisateur invalides');
  }
});

// ... (Garde logoutUser et getUserProfile tels quels) ...
const logoutUser = (req, res) => {
  res.cookie('jwt', '', { httpOnly: true, expires: new Date(0) });
  res.status(200).json({ message: 'Déconnecté avec succès' });
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
      driverId: user.driverId, // Ajouté ici aussi pour le voir dans le profil
      wallet: user.wallet,
      vehicleInfo: user.vehicleInfo // On pourra afficher sa voiture
    });
  } else {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }
});

export { authUser, registerUser, logoutUser, getUserProfile };