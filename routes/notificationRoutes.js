import express from 'express';
import { getUserNotifications, markAllNotificationsAsRead, clearUserNotifications} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/user-notifications', protect, getUserNotifications);
router.put('/mark-all-read', protect, markAllNotificationsAsRead);
router.delete('/clear-notifications', protect, clearUserNotifications);

export default router;
