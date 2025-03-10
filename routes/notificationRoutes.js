import express from 'express';
import { sendLikeNotification, sendDislikeNotification, getNotifications } from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/send-like-notification/:likedId', protect, sendLikeNotification);

router.post('/send-dislike-notification/:likedId', protect, sendDislikeNotification);

router.get('/user-notifications', protect, getNotifications);

export default router;
