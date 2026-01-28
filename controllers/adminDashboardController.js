 // controllers/adminDashboardController.js

import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/userModel.js';
import Ride from '../models/rideModel.js';
import Transaction from '../models/transactionModel.js';

const getDashboardStats = asyncHandler(async (req, res) => {
  const superAdminEmail = process.env.ADMIN_MAIL;
  const isSuperAdmin = req.user.email === superAdminEmail;

  const [totalRiders, totalDrivers, totalRides, completedRides] = await Promise.all([
    User.countDocuments({ role: 'rider' }),
    User.countDocuments({ role: 'driver' }),
    Ride.countDocuments(),
    Ride.countDocuments({ status: 'completed' })
  ]);

  const revenueData = await Ride.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, total: { $sum: '$price' } } }
  ]);

  const totalRevenue = revenueData[0]?.total || 0;

  let subscriptionStats = {};
  if (isSuperAdmin) {
    const weeklyCount = await Transaction.countDocuments({ 
      type: 'WEEKLY', 
      status: 'APPROVED' 
    });
    const monthlyCount = await Transaction.countDocuments({ 
      type: 'MONTHLY', 
      status: 'APPROVED' 
    });

    subscriptionStats = {
      weeklySubscriptions: weeklyCount,
      monthlySubscriptions: monthlyCount,
    };
  }

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const newUsers = await User.countDocuments({ createdAt: { $gte: last24h } });

  res.json({
    totalRiders,
    totalDrivers,
    totalRides,
    completedRides,
    totalRevenue,
    commission: totalRevenue * 0.10,
    newUsersLast24h: newUsers,
    ...subscriptionStats
  });
});

const getAllUsers = asyncHandler(async (req, res) => {
  const superAdminEmail = process.env.ADMIN_MAIL;
  const isSuperAdmin = req.user.email === superAdminEmail;

  let filter = {};
  
  if (!isSuperAdmin) {
    filter.email = { $ne: superAdminEmail };
  }

  const users = await User.find(filter)
    .select('-password')
    .sort({ createdAt: -1 });

  res.json(users);
});

const updateUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  const superAdminEmail = process.env.ADMIN_MAIL;
  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('Utilisateur introuvable');
  }

  if (user.email === superAdminEmail) {
    res.status(403);
    throw new Error('Impossible de modifier le SuperAdmin');
  }

  user.status = status;
  await user.save();

  res.json({ 
    message: `Statut de ${user.name} changé en ${status}`,
    user 
  });
});

const promoteToAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const superAdminEmail = process.env.ADMIN_MAIL;

  if (req.user.email !== superAdminEmail) {
    res.status(403);
    throw new Error('Seul le SuperAdmin peut nommer des admins');
  }

  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('Utilisateur introuvable');
  }

  user.role = 'admin';
  await user.save();

  res.json({ 
    message: `${user.name} est maintenant administrateur`,
    user 
  });
});

const revokeAdmin = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const superAdminEmail = process.env.ADMIN_MAIL;

  if (req.user.email !== superAdminEmail) {
    res.status(403);
    throw new Error('Seul le SuperAdmin peut révoquer des admins');
  }

  const user = await User.findById(userId);

  if (!user) {
    res.status(404);
    throw new Error('Utilisateur introuvable');
  }

  if (user.email === superAdminEmail) {
    res.status(403);
    throw new Error('Impossible de révoquer le SuperAdmin');
  }

  const previousRole = user.role;
  user.role = user.driverId ? 'driver' : 'rider';
  await user.save();

  res.json({ 
    message: `${user.name} n'est plus administrateur (${previousRole} → ${user.role})`,
    user 
  });
});

export { 
  getDashboardStats, 
  getAllUsers, 
  updateUserStatus,
  promoteToAdmin,
  revokeAdmin
};
