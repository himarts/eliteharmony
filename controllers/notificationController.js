import jwt from "jsonwebtoken";
import Notification from '../models/notification.js';
import User from '../models/user.js';
import { getSocket } from '../services/socket.js'; // Import the getSocket function

export const getUserNotifications = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized: No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Fetch notifications for the logged-in user, populating sender details
    const notifications = await Notification.find({ receiver: userId })
      .populate("sender", "name profilePicture") // Get sender name & profile pic
      .sort({ createdAt: -1 }); // Sort by latest notifications

    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
};


export const clearUserNotifications = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized: No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Delete all notifications for the logged-in user
    await Notification.deleteMany({ receiver: userId });

    res.status(200).json({ message: "All notifications cleared successfully." });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized: No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Update all notifications to "read: true" for the logged-in user
    await Notification.updateMany({ receiver: userId, read: false }, { read: true });

    res.status(200).json({ message: "All notifications marked as read." });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({ error: "Something went wrong." });
  }
};
