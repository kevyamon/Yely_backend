// controllers/adminController.js
import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/userModel.js';
import Ride from '../models/rideModel.js';

// @desc    Récupérer les stats globales (Tour de Contrôle)
// @route   GET /api/admin/stats
// @access  Private/SuperAdmin
const getDashboardStats = asyncHandler(async (req, res) => {
  // Calculs ultra-rapides en parallèle
  const [totalUsers, totalDrivers, totalRides, revenueData] = await Promise.all([
    User.countDocuments({ role: 'rider' }),
    User.countDocuments({ role: 'driver' }),
    Ride.countDocuments(),
    Ride.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ])
  ]);

  // Affluence : Inscriptions des dernières 24h
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const newInscriptions = await User.countDocuments({ createdAt: { $gte: last24h } });

  res.json({
    totalUsers,
    totalDrivers,
    totalRides,
    totalRevenue: revenueData[0]?.total || 0,
    totalCommission: (revenueData[0]?.total || 0) * 0.10, // Tes 10%
    affluence: newInscriptions
  });
});

// @desc    Bloquer/Bannir/Débloquer un utilisateur ou chauffeur
// @route   PUT /api/admin/user-status/:id
// @access  Private/SuperAdmin
const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  const { status } = req.body; // active, suspended, banned

  if (user) {
    if (user.role === 'superAdmin') {
      res.status(403);
      throw new Error("Impossible de modifier le statut d'un SuperAdmin !");
    }
    user.status = status;
    await user.save();
    res.json({ message: `Statut mis à jour : ${status}` });
  } else {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }
});

// @desc    Ajouter un Bonus/Ajuster le portefeuille
// @route   PUT /api/admin/bonus/:id
// @access  Private/SuperAdmin
const addBonus = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const user = await User.findById(req.params.id);

  if (user) {
    user.wallet += Number(amount);
    await user.save();
    res.json({ message: `Bonus de ${amount} FCFA appliqué à ${user.name}` });
  } else {
    res.status(404);
    throw new Error('Utilisateur non trouvé');
  }
});

export { getDashboardStats, updateUserStatus, addBonus };