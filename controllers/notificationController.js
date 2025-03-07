import Notification from '../models/notification.js';
import User from '../models/user.js';
import { getSocket } from '../services/socket.js'; // Import the getSocket function

// Send Notification when a user likes another user
export const sendLikeNotification = async (req, res) => {
  try {
    const likerId = req.user?.userId; // Get likerId from req.user.userId
    const likedId = req.params?.likedId;

    const [liker, liked] = await Promise.all([
      User.findById(likerId).exec(),
      User.findById(likedId).exec(),
    ]);

    if (!liked || !liker) {
      return { success: false, message: "User not found." };
    }

    const notification = new Notification({
      sender: likerId,
      receiver: likedId,
      message: `${liker.username || 'Someone'} liked your profile.`,
      type: 'like'
    });

    await notification.save();

    // Emit real-time notification to frontend
    if (req.io) {
      req.io.to(likedId).emit("new-notification", notification);
    }

    // Emit notification using socket instance
    const io = getSocket();
    io.to(likedId).emit('notification', { message: 'Someone liked your profile!' });

    console.log("Notification sent successfully.", notification); // Debugging statement
    return { success: true, message: "Notification sent successfully.", data: notification };
  } catch (error) {
    console.error("Error sending notification:", error);
    return { success: false, message: "Error sending notification." };
  }
};

// Send Notification when a user dislikes another user
export const sendDislikeNotification = async (likerId, likedId) => {
  try {
    const [liker, liked] = await Promise.all([
      User.findById(likerId).exec(),
      User.findById(likedId).exec(),
    ]);

    if (!liker || !liked) {
      return { success: false, message: "User not found." };
    }

    const notification = new Notification({
      sender: likerId,
      receiver: likedId,
      message: `${liker.username} disliked your profile.`,
      type: 'dislike'
    });

    const result = await notification.save();
    if (result.success) {
      const io = getSocket();
      io.to(likedId).emit('notification', { message: 'Someone disliked your profile!' });
    }
    return { success: true, message: "Notification sent successfully." };

  } catch (error) {
    console.error("Error sending notification:", error);
    return { success: false, message: "Error sending notification." };
  }
};

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId; // Extract user ID from authenticated request

    const notifications = await Notification.find({ receiver: userId })
      .sort({ createdAt: -1 }) // Sort by most recent
      .populate("sender", "username profilePicture"); // Populate sender details

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: "Error fetching notifications" });
  }
};
