// backend/utils/socketManager.js
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken'; // <--- IMPERATIF : On a besoin de vérifier le token ici
import User from '../models/userModel.js';

const socketManager = {
  io: null,
  
  init: (io) => {
    socketManager.io = io;
    
    // 🔥 LE SECRET "UBER" : MIDDLEWARE D'AUTHENTIFICATION
    // On intercepte chaque connexion AVANT qu'elle ne soit établie.
    io.use(async (socket, next) => {
      try {
        // 1. On récupère le token envoyé par le Frontend (socketService.js le fait déjà)
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentification échouée: Token manquant'));
        }

        // 2. On décrypte le token pour savoir QUI se connecte
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 3. On récupère l'user en base (sans le mot de passe)
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
          return next(new Error('Authentification échouée: Utilisateur inconnu'));
        }

        // 4. ON ATTACHE L'USER AU SOCKET
        // Maintenant, "socket.user" contient toutes les infos du chauffeur !
        socket.user = user;
        
        next(); // On laisse passer
      } catch (error) {
        console.error("⛔ Socket Auth Error:", error.message);
        next(new Error('Authentification invalide'));
      }
    });

    // --- UNE FOIS CONNECTÉ ---
    io.on('connection', async (socket) => {
      const user = socket.user; // On récupère l'user identifié par le middleware
      const userId = user._id.toString();

      console.log(`⚡ [AUTO-JOIN] Connecté: ${user.name} (${user.role})`);

      // 1. AUTO-JOIN ROOM PERSO (Plus besoin de le demander !)
      socket.join(userId); 
      console.log(`✅ ${user.name} a été ajouté de force à la room: ${userId}`);

      // 2. AUTO-JOIN DRIVER (Si c'est un chauffeur)
      if (user.role === 'driver') {
        socket.join('drivers');
        console.log(`🚖 ${user.name} a été ajouté au canal 'drivers'.`);

        // Mise à jour statut automatique
        try {
          await User.updateOne({ _id: userId }, { $set: { isOnline: true, isAvailable: true } });
        } catch (e) { console.error(e); }
      } else {
        // Si c'est un passager
        try {
          await User.updateOne({ _id: userId }, { $set: { isOnline: true } });
        } catch (e) { console.error(e); }
      }

      // 3. ECOUTEURS (GPS, Déconnexion...)
      
      // Mise à jour Position (Toujours nécessaire car ça change tout le temps)
      socket.on('update_location', async (data) => {
        // data peut être juste { lat, lng } car on connait déjà l'user !
        const lat = data.coordinates?.lat || data.lat;
        const lng = data.coordinates?.lng || data.lng;

        if (!lat || !lng) return;

        try {
           await User.updateOne(
             { _id: userId },
             { 
               $set: { 
                 currentLocation: { type: 'Point', coordinates: [lng, lat] },
                 isAvailable: true 
               }
             }
           );
        } catch (e) {} // Silent
      });

      socket.on('disconnect', async () => {
        console.log(`❌ Déconnexion: ${user.name}`);
        // Optionnel : Passer hors ligne après un délai
      });
    });
  },

  // Helpers
  emitToUser: (userId, event, data) => {
    if (socketManager.io) socketManager.io.to(userId).emit(event, data);
  },
  emitToAll: (event, data) => {
    if (socketManager.io) socketManager.io.emit(event, data);
  }
};

export default socketManager;