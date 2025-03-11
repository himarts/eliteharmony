import User from '../models/user.js';
import { matchUsers } from './matchControllers.js';
import { sendLikeNotification } from './notificationController.js'; // Import the notification controller
import jwt from 'jsonwebtoken';
import { getSocket, getUsers } from "../services/socket.js";
import {extractUserIdFromToken} from '../utils/auth.js';
// Like a User
export const likeUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUserId = decoded.userId;
    const { profileId } = req.params;

    if (currentUserId === profileId) {
      return res.status(400).json({ error: "You cannot like yourself." });
    }

    const [currentUser, likedUser] = await Promise.all([
      User.findById(currentUserId),
      User.findById(profileId),
    ]);

    if (!likedUser) {
      return res.status(404).json({ error: "Liked user not found." });
    }

    currentUser.likedUsers = currentUser.likedUsers || [];
    currentUser.dislikedUsers = currentUser.dislikedUsers || [];
    likedUser.likedUsers = likedUser.likedUsers || [];
    likedUser.matches = likedUser.matches || [];
    currentUser.matches = currentUser.matches || [];

    // Remove from dislikedUsers if user was disliked before
    currentUser.dislikedUsers = currentUser.dislikedUsers.filter(
      (id) => id.toString() !== profileId
    );

    let isMatch = false;

    if (!currentUser.likedUsers.includes(profileId)) {
      currentUser.likedUsers.push(profileId);

      // Check if it's a match
      if (likedUser.likedUsers.includes(currentUserId)) {
        isMatch = true;
        currentUser.matches.push(profileId);
        likedUser.matches.push(currentUserId);
      }

      // Emit real-time like notification **only if the user is online**
          // **🔥 Emit a dislike notification to the disliked user only**
    const io = getSocket();
    const users = getUsers(); // Get online users
    const receiverSocketId = users.get(profileId);
      if (io && receiverSocketId) {
        io.to(receiverSocketId).emit("receiveNotification", {
          type: "like",
          message: isMatch
            ? `🔥 It's a match! You and ${currentUser.name} liked each other!`
            : `❤️ ${currentUser.name} liked your profile!`,
        });
        console.log(`👍 Sent like notification to ${profileId}`);
      } else {
        console.log(`⚠️ User ${profileId} is offline. No notification sent.`);
      }
    }

    await Promise.all([currentUser.save(), likedUser.save()]);

    res.status(200).json({
      message: isMatch ? "It's a match!" : "User liked successfully.",
    });
  } catch (error) {
    console.error("Error in likeUser:", error);
    res.status(500).json({ error: error.message || "Something went wrong." });
  }
};

// Get Liked Users
export const getLikedUsers = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUserId = decoded.userId;
    const currentUser = await User.findById(currentUserId).populate('likedUsers', '-password -verificationCode');

    if (!currentUser) {
      return res.status(404).json({ error: "User not found." });
    }
    res.status(200).json(currentUser.likedUsers);
  } catch (error) {
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
    res.status(500).json({ error: "Something went wrong." });
  }
};

// Dislike a User
export const dislikeUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized: No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUserId = decoded.userId;
    const { profileId } = req.params;

    if (currentUserId === profileId) {
      return res.status(400).json({ error: "You cannot dislike yourself." });
    }

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ error: "User not found." });
    }

    // Remove from likedUsers if present
    currentUser.likedUsers = currentUser.likedUsers.filter(id => id.toString() !== profileId);

    // Add to dislikedUsers if not already there
    if (!currentUser.dislikedUsers.includes(profileId)) {
      currentUser.dislikedUsers.push(profileId);
    }

    await currentUser.save();

    // **🔥 Emit a dislike notification to the disliked user only**
    const io = getSocket();
    const users = getUsers(); // Get online users
    const receiverSocketId = users.get(profileId);

    if (io && receiverSocketId) {
      io.to(receiverSocketId).emit("receiveNotification", {
        type: "dislike",
        message: "Someone disliked your profile!",
      });
      console.log(`👎 Sent dislike notification to ${profileId}`);
    } else {
      console.log(`⚠️ User ${profileId} is offline. No notification sent.`);
    }

    res.status(200).json({ message: "User disliked successfully." });
  } catch (error) {
    console.error("Error in dislikeUser:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
};

export const getLikeDislikeNotifications = async (req, res) => {
  try {
    // Get user ID from JWT token
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Fetch latest likes where the logged-in user is the receiver
    const likes = await Like.find({ likedUser: userId })
      .populate("liker", "name") // Populate liker name
      .sort({ createdAt: -1 }) // Sort by latest first
      .limit(10); // Limit to last 10 likes

    // Fetch latest dislikes where the logged-in user is the receiver
    const dislikes = await Dislike.find({ dislikedUser: userId })
      .populate("disliker", "name") // Populate disliker name
      .sort({ createdAt: -1 }) // Sort by latest first
      .limit(10); // Limit to last 10 dislikes

    // Format the response
    const likeNotifications = likes.map((like) => ({
      type: "like",
      userName: like.liker.name,
      message: `${like.liker.name} liked your profile!`,
      timestamp: like.createdAt,
    }));

    const dislikeNotifications = dislikes.map((dislike) => ({
      type: "dislike",
      userName: dislike.disliker.name,
      message: `${dislike.disliker.name} disliked your profile.`,
      timestamp: dislike.createdAt,
    }));

    // Combine and sort notifications by latest timestamp
    const notifications = [...likeNotifications, ...dislikeNotifications].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    res.status(200).json({ notifications });
  } catch (error) {
    console.error("❌ Error fetching like/dislike notifications:", error);
    res.status(500).json({ error: "Internal Server Error" });
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

