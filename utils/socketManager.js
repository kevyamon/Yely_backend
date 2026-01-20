// backend/utils/socketManager.js
let io;

const socketManager = {
  init: (socketIoInstance) => {
    io = socketIoInstance;
    
    io.on('connection', (socket) => {
      console.log(`⚡ Connexion réseau Yély : ${socket.id}`);

      // Chauffeur rejoint sa zone de travail
      socket.on('joinZone', (zoneId) => {
        socket.join(zoneId);
      });

      // 🟢 CORRECTION ICI : On accepte 'coordinates' (envoyé par le front)
      socket.on('updateLocation', (data) => {
        const { rideId, coordinates } = data; 
        // On relaie exactement ce qu'on reçoit
        if (rideId && coordinates) {
            socket.to(rideId).emit('driverLocationUpdate', coordinates);
        }
      });

      // Rejoindre le canal d'un trajet spécifique
      socket.on('joinRide', (rideId) => {
        socket.join(rideId);
      });

      socket.on('joinAdminRoom', () => {
        socket.join('admin_room');
      });

      socket.on('disconnect', () => {
        console.log('🔌 Déconnexion du réseau Yély');
      });
    });
  },

  notifyNewRide: (zoneId, rideData) => {
    if (io) io.to(zoneId).emit('newRideAvailable', rideData);
  },

  broadcastAdminUpdate: (type, data) => {
    if (io) io.to('admin_room').emit('dashboardUpdate', { type, data });
  },

  sendSystemMessage: (rideId, message) => {
    if (io) io.to(rideId).emit('systemAlert', { message });
  }
};

export default socketManager;