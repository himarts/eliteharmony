import express from 'express';
import { sendLikeNotification, sendDislikeNotification, getNotifications } from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/send-like-notification/:likedId', protect, async (req, res) => {
  const likerId = req.user?.userId; // Get likerId from req.user.userId
  const { likedId } = req.params;
  const result = await sendLikeNotification(likerId, likedId);
  res.status(result.success ? 200 : 400).json(result);
});

router.post('/send-dislike-notification/:likedId', protect, async (req, res) => {
  const likerId = req.user?.userId; // Get likerId from req.user.userId
  const { likedId } = req.params;
  const result = await sendDislikeNotification(likerId, likedId);
  res.status(result.success ? 200 : 400).json(result);
});

router.get('/user-notifications', protect, getNotifications);

export default router;
