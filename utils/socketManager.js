// backend/utils/socketManager.js
import { Server } from 'socket.io';
import User from '../models/userModel.js';

const socketManager = {
  io: null,
  
  init: (io) => {
    socketManager.io = io;
    
    io.on('connection', (socket) => {
      console.log(`🔌 Nouvelle connexion Socket: ${socket.id}`);

      // 1. REJOINDRE LA ROOM UTILISATEUR (Classique)
      socket.on('join_user', async (userId) => {
        socket.join(userId);
        console.log(`👤 User ${userId} a rejoint sa room perso.`);
        
        try {
          await User.updateOne(
            { _id: userId },
            { $set: { isOnline: true } }
          );
        } catch (error) {
          console.error("Erreur update status online:", error);
        }
      });

      // ============================================================
      // 🚨 C'EST ICI LA CORRECTION CRITIQUE QUI MANQUAIT 🚨
      // ============================================================
      socket.on('join_driver_room', async ({ driverId }) => {
        if (!driverId) return;
        
        // Le chauffeur rejoint sa room ID spécifique (pour les offres directes)
        socket.join(driverId);
        // Il rejoint aussi le canal global 'drivers' (pour les broadcasts généraux)
        socket.join('drivers'); 
        
        console.log(`🚖 Chauffeur ${driverId} a rejoint le canal 'drivers'.`);

        try {
            // On force le statut "Disponible" pour qu'il soit vu par la recherche géo
            await User.updateOne(
                { _id: driverId }, 
                { $set: { isAvailable: true, isOnline: true } }
            );
        } catch (error) {
            console.error("Erreur update driver status:", error);
        }
      });
      // ============================================================

      // 3. MISE À JOUR POSITION (Indispensable pour le Geo-Search)
      socket.on('update_location', async (data) => {
        // data: { userId, lat, lng }
        const { userId, lat, lng } = data;
        
        if (!userId || !lat || !lng) return;

        try {
            await User.updateOne(
                { _id: userId },
                { 
                    $set: { 
                        currentLocation: {
                            type: 'Point',
                            coordinates: [lng, lat] // Mongo stocke [Longitude, Latitude]
                        },
                        // On réaffirme qu'il est dispo à chaque mouvement
                        isAvailable: true 
                    }
                }
            );
        } catch (error) {
            // Silent fail
        }
      });

      socket.on('disconnect', () => {
        console.log(`❌ Déconnexion Socket: ${socket.id}`);
      });
    });
  },

  // Helpers pour émettre depuis les contrôleurs
  emitToUser: (userId, event, data) => {
    if (socketManager.io) {
      socketManager.io.to(userId).emit(event, data);
    }
  },

  emitToAll: (event, data) => {
      if (socketManager.io) {
          socketManager.io.emit(event, data);
      }
  }
};

export default socketManager;