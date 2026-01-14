// utils/socketManager.js
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

      // Tracking GPS en temps réel (Chauffeur -> Client)
      socket.on('updateLocation', (data) => {
        const { rideId, location } = data;
        socket.to(rideId).emit('driverLocationUpdate', location);
      });

      // Rejoindre le canal d'un trajet spécifique
      socket.on('joinRide', (rideId) => {
        socket.join(rideId);
      });

      // Canal spécial pour la Tour de Contrôle Admin
      socket.on('joinAdminRoom', () => {
        socket.join('admin_room');
        console.log('🛡️ Un SuperAdmin a rejoint la Tour de Contrôle');
      });

      socket.on('disconnect', () => {
        console.log('🔌 Déconnexion du réseau Yély');
      });
    });
  },

  // Alerte pour les chauffeurs (Nouvelle course)
  notifyNewRide: (zoneId, rideData) => {
    if (io) io.to(zoneId).emit('newRideAvailable', rideData);
  },

  // Alerte instantanée pour la Tour de Contrôle (Stats, Alertes)
  broadcastAdminUpdate: (type, data) => {
    if (io) io.to('admin_room').emit('dashboardUpdate', { type, data });
  },

  // Message système au trajet
  sendSystemMessage: (rideId, message) => {
    if (io) io.to(rideId).emit('systemAlert', { message });
  }
};

export default socketManager;