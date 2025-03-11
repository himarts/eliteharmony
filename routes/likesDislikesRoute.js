import express from 'express';
import { likeUser, dislikeUser  } from '../controllers/likesDislikes.js';
import { protect } from '../middleware/authMiddleware.js'; // Middleware to authenticate users

const router = express.Router();

// Route to like a user
router.post('/likes/:profileId', protect, likeUser);

// Route to dislike a user
router.post('/disliked/:profileId', protect, dislikeUser);

// Route to get all liked 

// Route to send like notification
router.post('/like', protect, async (req, res) => {
  const { likerId, likedId } = req.body;

  console.log("Route Handler - likerId:", likerId); // Debugging statement
  console.log("Route Handler - likedId:", likedId); // Debugging statement

  if (!likerId || !likedId) {
    return res.status(400).json({ success: false, message: "likerId and likedId are required." });
  }

  const result = await sendLikeNotification(req, likerId, likedId);

  if (result.success) {
    res.status(200).json(result);
  } else {
    res.status(400).json(result);
  }
});

// Route to get all matches
// router.get('/matches', authenticateUser, getMatchedUsers);

export default router;
