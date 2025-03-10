import express from 'express';
import { protect } from '../middleware/authMiddleware.js'; // Middleware to authenticate user
import { sendMessage, getChatHistory, markAsRead, getUnreadMessageCount, resetUnreadMessages} from '../controllers/chatController.js';

const router = express.Router();

// Route to send a chat message
router.post('/send', protect, sendMessage);

// Route to mark a message as read
router.post('/read', protect, markAsRead);

// Route to get message history between two users
router.get('/history/:userId', protect, getChatHistory);
router.get("/unread-messages", protect, getUnreadMessageCount);
router.get("/reset-unread-messages/:userId", protect, resetUnreadMessages);
export default router;
