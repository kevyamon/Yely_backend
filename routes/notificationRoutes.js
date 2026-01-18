// backend/routes/notificationRoutes.js
import express from 'express';
const router = express.Router();
import { getNotifications, markAllAsRead } from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

router.route('/').get(protect, getNotifications);
router.route('/mark-read').put(protect, markAllAsRead);

export default router;