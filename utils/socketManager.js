// backend/utils/socketManager.js
import { Server } from 'socket.io';
import User from '../models/userModel.js';
import Ride from '../models/rideModel.js';

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

      // 2. REJOINDRE LA ROOM CHAUFFEUR (CRITIQUE pour recevoir les courses)
      // C'est l'événement qui manquait dans ton fichier
      socket.on('join_driver_room', async ({ driverId }) => {
        if (!driverId) return;
        
        // Le chauffeur rejoint sa room ID spécifique (pour recevoir les offres directes)
        socket.join(driverId);
        // Il rejoint aussi le canal global 'drivers' (pour les broadcasts)
        socket.join('drivers'); 
        
        console.log(`🚖 Chauffeur ${driverId} a rejoint le canal 'drivers'.`);

        try {
            // On s'assure qu'il est bien marqué "Disponible" et "En ligne"
            // C'est INDISPENSABLE pour que la recherche $near du rideController le trouve
            await User.updateOne(
                { _id: driverId }, 
                { $set: { isAvailable: true, isOnline: true } }
            );
        } catch (error) {
            console.error("Erreur update driver status:", error);
        }
      });

      // 3. MISE À JOUR POSITION (Indispensable pour le Geo-Search)
      socket.on('update_location', async (data) => {
        // data: { userId, lat, lng, role }
        const { userId, lat, lng, role } = data;
        
        if (!userId || !lat || !lng) return;

        try {
            await User.updateOne(
                { _id: userId },
                { 
                    $set: { 
                        currentLocation: {
                            type: 'Point',
                            coordinates: [lng, lat] // Mongo: [Long, Lat]
                        },
                        // IMPORTANT : On réaffirme qu'il est dispo à chaque mouvement
                        // Sinon un chauffeur qui bouge pourrait devenir invisible si son statut saute
                        isAvailable: true 
                    }
                }
            );
        } catch (error) {
            // Silent fail pour perf
        }
      });

      socket.on('disconnect', async () => {
        console.log(`❌ Déconnexion Socket: ${socket.id}`);
        // Note: Pour gérer le offline, il faudrait mapper socket.id -> userId
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