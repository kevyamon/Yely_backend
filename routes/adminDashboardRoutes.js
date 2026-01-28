  // routes/adminDashboardRoutes.js

import express from 'express';
const router = express.Router();
import { 
  getDashboardStats, 
  getAllUsers, 
  updateUserStatus,
  promoteToAdmin,
  revokeAdmin
} from '../controllers/adminDashboardController.js';
import { protect } from '../middleware/authMiddleware.js';
import { adminOnly, superAdminOnly } from '../middleware/admin/superAdminMiddleware.js';

router.route('/stats').get(protect, adminOnly, getDashboardStats);
router.route('/users').get(protect, adminOnly, getAllUsers);
router.route('/users/:userId/status').put(protect, adminOnly, updateUserStatus);
router.route('/users/:userId/promote').put(protect, superAdminOnly, promoteToAdmin);
router.route('/users/:userId/revoke').put(protect, superAdminOnly, revokeAdmin);

export default router;
