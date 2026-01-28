// middleware/detectSuperAdmin.js
const User = require('../models/userModel');

const detectSuperAdmin = async (req, res, next) => {
  try {
    const email = process.env.SUPER_ADMIN_EMAIL;
    const password = process.env.SUPER_ADMIN_PASSWORD;

    // Si les variables d'environnement ne sont pas configurées, on passe
    if (!email || !password) {
      return next();
    }

    // Vérification : Est-ce que le Super Admin existe déjà ?
    const existingAdmin = await User.findOne({ email });

    if (!existingAdmin) {
      // CAS 1 : Il n'existe pas -> On le crée
      console.log('⚡ Super Admin introuvable. Création automatique...');
      
      await User.create({
        name: 'Super Admin',
        email: email,
        password: password, // Le hook pre('save') du User Model se chargera de crypter ce mot de passe
        role: 'superAdmin',
        isAdmin: true,
        isVerified: true
      });

      console.log('✅ Super Admin créé avec succès.');
    } 
    // CAS 2 : Il existe déjà -> ON NE FAIT RIEN.
    // C'est ici que le bug se produisait avant : on ne touche plus au compte existant.

    next();
  } catch (error) {
    console.error(`❌ Erreur dans detectSuperAdmin : ${error.message}`);
    // On continue l'exécution même en cas d'erreur pour ne pas bloquer l'app
    next();
  }
};

module.exports = detectSuperAdmin;