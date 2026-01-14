// config/db.js
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Tentative de connexion à MongoDB via l'URL cachée dans le .env
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ Forteresse connectée à MongoDB : ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Erreur de connexion : ${error.message}`);
    // Si la connexion échoue, on arrête tout pour ne pas laisser le serveur tourner dans le vide
    process.exit(1);
  }
};

export default connectDB;