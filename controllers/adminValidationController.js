// controllers/adminValidationController.js

import asyncHandler from '../middleware/asyncHandler.js';
import Transaction from '../models/transactionModel.js';
import User from '../models/userModel.js';
import { deleteFromCloudinary } from '../utils/cloudinaryCleanup.js';

const getPendingTransactions = asyncHandler(async (req, res) => {
  const userRole = req.user.role;
  const superAdminEmail = process.env.ADMIN_MAIL;
  
  let filter = { status: 'PENDING' };

  if (userRole === 'admin' && req.user.email !== superAdminEmail) {
    filter.assignedTo = 'PARTNER';
  }

  const transactions = await Transaction.find(filter)
    .populate('driver', 'name email phone profilePicture driverId')
    .sort({ createdAt: -1 });

  res.json(transactions);
});

const approveTransaction = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;

  const transaction = await Transaction.findById(transactionId);

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction introuvable');
  }

  const superAdminEmail = process.env.ADMIN_MAIL;
  const isWeekly = transaction.type === 'WEEKLY';
  
  if (isWeekly && req.user.email !== superAdminEmail) {
    res.status(403);
    throw new Error('Seul le SuperAdmin peut valider les abonnements hebdomadaires');
  }

  transaction.status = 'APPROVED';
  transaction.validatedBy = req.user._id;
  await transaction.save();

  const driver = await User.findById(transaction.driver);
  
  if (!driver) {
    res.status(404);
    throw new Error('Chauffeur introuvable');
  }

  const now = new Date();
  let hoursToAdd;

  if (transaction.type === 'WEEKLY') {
    hoursToAdd = 7 * 24;
  } else {
    hoursToAdd = 30 * 24;
  }

  driver.subscription.status = 'active';
  driver.subscription.plan = transaction.type;
  driver.subscription.remainingHours = (driver.subscription.remainingHours || 0) + hoursToAdd;
  driver.subscription.totalHours = hoursToAdd;
  driver.subscription.lastCheckTime = now;
  driver.subscription.activatedAt = now;
  
  await driver.save();

  await deleteFromCloudinary(transaction.proofImagePublicId);

  res.json({
    message: `Abonnement ${transaction.type} activé pour ${driver.name}. Durée: ${hoursToAdd}h`,
    transaction,
    driver: {
      _id: driver._id,
      name: driver.name,
      subscription: driver.subscription
    }
  });
});

const rejectTransaction = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    res.status(400);
    throw new Error('Vous devez indiquer une raison de rejet');
  }

  const transaction = await Transaction.findById(transactionId);

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction introuvable');
  }

  const superAdminEmail = process.env.ADMIN_MAIL;
  const isWeekly = transaction.type === 'WEEKLY';
  
  if (isWeekly && req.user.email !== superAdminEmail) {
    res.status(403);
    throw new Error('Seul le SuperAdmin peut gérer les abonnements hebdomadaires');
  }

  transaction.status = 'REJECTED';
  transaction.rejectionReason = reason;
  transaction.validatedBy = req.user._id;
  await transaction.save();

  await deleteFromCloudinary(transaction.proofImagePublicId);

  res.json({
    message: 'Transaction rejetée',
    transaction
  });
});

export { 
  getPendingTransactions,
  approveTransaction, 
  rejectTransaction 
};