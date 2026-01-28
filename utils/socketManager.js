// utils/socketManager.js
import { Server } from 'socket.io';
import User from '../models/userModel.js';
import Ride from '../models/rideModel.js';

const socketManager = {
  io: null,
  
  init: (io) => {
    socketManager.io = io;
    
    io.on('connection', (socket) => {
      console.log(`🔌 Nouvelle connexion Socket: ${socket.id}`);

      socket.on('join_user', async (userId) => {
        socket.join(userId);
        console.log(`👤 User ${userId} a rejoint sa room.`);
        
        // CORRECTION MAJEURE : Utilisation de updateOne au lieu de save()
        // Cela empêche formellement la corruption du mot de passe
        try {
          await User.updateOne(
            { _id: userId },
            { $set: { isOnline: true } }
          );
        } catch (error) {
          console.error("Erreur update status online:", error);
        }
      });

      socket.on('update_location', async (data) => {
        // data: { userId, lat, lng, role }
        const { userId, lat, lng, role } = data;
        
        try {
            await User.updateOne(
                { _id: userId },
                { 
                    $set: { 
                        currentLocation: {
                            type: 'Point',
                            coordinates: [lng, lat] // Mongo: [Long, Lat]
                        }
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