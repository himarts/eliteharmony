import express from 'express';
import { protect } from '../middleware/authMiddleware.js'; // Middleware to authenticate user
import { sendMessage, getChatHistory,getMessageNotifications, markMessagesAsRead, getUnreadMessageCount, resetUnreadMessages} from '../controllers/chatController.js';

const router = express.Router();

// Route to send a chat message
router.post('/send', protect, sendMessage);

// Route to get message history between two users
router.get('/history/:userId', protect, getChatHistory);
router.get("/unread-messages", protect, getUnreadMessageCount);
router.get('/notifications', protect, getMessageNotifications);

// Route to mark a message as read
router.put('/read', protect, markMessagesAsRead);
router.put("/reset-unread-messages", protect, resetUnreadMessages);

export default router;
