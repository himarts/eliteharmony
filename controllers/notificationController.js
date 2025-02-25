import Notification from '../models/notification.js';
import User from '../models/user.js';

// Send Notification when a user likes another user
export const sendLikeNotification = async (likerId, likedId) => {
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
      message: `${liker.username} liked your profile.`,
      type: 'like'
    });

    await notification.save();
    return { success: true, message: "Notification sent successfully." };
    res.status(result.success ? 200 : 400).json(result);
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

    await notification.save();
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
