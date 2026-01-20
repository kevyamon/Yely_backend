let io;

const socketManager = {
  init: (socketIoInstance) => {
    io = socketIoInstance;
    
    io.on('connection', (socket) => {
      console.log(`⚡ Connexion réseau Yély : ${socket.id}`);

      // Chauffeur rejoint sa zone de travail (Entrée en service)
      socket.on('joinZone', (zoneId) => {
        socket.join(zoneId);
        console.log(`Socket ${socket.id} a rejoint la zone : ${zoneId}`);
      });

      // 🟢 NOUVEAU : Chauffeur quitte sa zone (Fin de service)
      socket.on('leaveZone', (zoneId) => {
        socket.leave(zoneId);
        console.log(`Socket ${socket.id} a quitté la zone : ${zoneId}`);
      });

      // Tracking GPS en temps réel
      socket.on('updateLocation', (data) => {
        const { rideId, location } = data;
        // On renvoie la position seulement au client concerné par la course
        if (rideId) {
            socket.to(rideId).emit('driverLocationUpdate', location);
        }
      });

      // Rejoindre le canal d'un trajet spécifique
      socket.on('joinRide', (rideId) => {
        socket.join(rideId);
      });

      // Canal spécial Admin
      socket.on('joinAdminRoom', () => {
        socket.join('admin_room');
      });

      socket.on('disconnect', () => {
        console.log('🔌 Déconnexion du réseau Yély');
      });
    });
  },

  // Alerte pour les chauffeurs
  notifyNewRide: (zoneId, rideData) => {
    if (io) io.to(zoneId).emit('newRideAvailable', rideData);
  },

  // Alerte Admin
  broadcastAdminUpdate: (type, data) => {
    if (io) io.to('admin_room').emit('dashboardUpdate', { type, data });
  },

  // Message système
  sendSystemMessage: (rideId, message) => {
    if (io) io.to(rideId).emit('systemAlert', { message });
  }
};

export default socketManager;