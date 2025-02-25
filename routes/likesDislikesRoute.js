import express from 'express';
import { likeUser, dislikeUser, getDislikedUsers, getLikedUsers } from '../controllers/likesDislikes.js';
import { protect} from '../middleware/authMiddleware.js'; // Middleware to authenticate users

const router = express.Router();

// Route to like a user
router.post('/likes/:profileId', protect, likeUser);

// Route to dislike a user
router.post('/disliked/:profileId', protect, dislikeUser);

// Route to get all liked 
router.get('/liked', protect, getLikedUsers);

// Route to get all disliked

router.get('/disliked', protect, getDislikedUsers);
// Route to get all matches
// router.get('/matches', authenticateUser, getMatchedUsers);


export default router;
