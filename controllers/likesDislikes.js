import User from '../models/user.js';
import { matchUsers } from './matchControllers.js';
import { sendLikeNotification } from './notificationController.js'; // Import the notification controller
// Like a User
export const likeUser = async (req, res) => {
  try {
    const currentUserId = req.user?.userId    //✅ Ensure correct user ID
    const { profileId } = req.params;

    if (currentUserId === profileId) {
      return res.status(400).json({ error: "You cannot like yourself." });
    }

    const currentUser = await User.findById(currentUserId);
    const likedUser = await User.findById(profileId);

    if (!likedUser) {
      return res.status(404).json({ error: "Liked user not found." });
    }

    // ✅ Ensure `likedUsers` and `dislikedUsers` exist

    currentUser.likedUsers = currentUser.likedUsers || [];
    currentUser.dislikedUsers = currentUser.dislikedUsers || [];
    likedUser.likedUsers = likedUser.likedUsers || [];
    likedUser.matches = likedUser.matches || [];
    currentUser.matches = currentUser.matches || [];

    // Remove from dislikedUsers if it exists
    currentUser.dislikedUsers = currentUser.dislikedUsers.filter(id => id.toString() !== profileId);

    // Add to likedUsers if not already liked
    if (!currentUser.likedUsers.includes(profileId)) {
      currentUser.likedUsers.push(profileId);
      await sendLikeNotification(currentUserId, profileId); // Send notification
    }

    // Mutual like → Match

    if (likedUser.likedUsers.includes(currentUserId)) {
      if (!currentUser.matches.includes(profileId)) {
        currentUser.matches.push(profileId);
        likedUser.matches.push(currentUserId);
      }
    }

    // Save both users efficiently

    await Promise.all([currentUser.save(), likedUser.save()]);

    res.status(200).json({
      message: likedUser.likedUsers.includes(currentUserId) ? "It's a match!" : "User liked successfully."
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
};

// Get Liked Users
export const getLikedUsers = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const currentUser = await User.findById(currentUserId).populate('likedUsers', '-password -verificationCode');

    if (!currentUser) {
      return res.status(404).json({ error: "User not found." });
    }
    res.status(200).json(currentUser.likedUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
};

// Get Disliked Users
export const getDislikedUsers = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const currentUser = await User.findById(currentUserId).populate('dislikedUsers', '-password -verificationCode');

    if (!currentUser) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json(currentUser.dislikedUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
};

// Dislike a User
export const dislikeUser = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { profileId } = req.params;

    // Ensure the user is not disliking themselves
    if (currentUserId === profileId) {
      return res.status(400).json({ error: "You cannot dislike yourself." });
    }

    const currentUser = await User.findById(currentUserId);
    const dislikedUser = await User.findById(profileId);

    if (!dislikedUser) {
      return res.status(404).json({ error: "Disliked user not found." });
    }

    // Check if the disliked user is in likedUsers
    const likedIndex = currentUser.likedUsers.indexOf(profileId);
    if (likedIndex !== -1) {
      // Remove from likedUsers
      currentUser.likedUsers.splice(likedIndex, 1);
    }

    // Ensure the user is not already in dislikedUsers
    if (!currentUser.dislikedUsers.includes(profileId)) {
      currentUser.dislikedUsers.push(profileId);
    }

    await currentUser.save();

    res.status(200).json({ message: "User disliked successfully." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong." });
  }
};

const calculateDistance = (location1, location2) => {
    const [lat1, lon1] = location1.split(",").map(Number);
    const [lat2, lon2] = location2.split(",").map(Number);
  
    return geolib.getDistance(
      { latitude: lat1, longitude: lon1 },
      { latitude: lat2, longitude: lon2 }
    ) / 1000;  // Convert to kilometers
  };

