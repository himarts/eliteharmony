import Chat from '../models/chat.js';
import User from '../models/user.js';
import Notification from '../models/notification.js';
import { maskPhoneNumber } from '../utils/maskPhone.js';
import { getUsers } from '../services/socket.js';
import jwt from 'jsonwebtoken';
import mongoose from "mongoose";

// Send message and notify in real-time
export const sendMessage = async (req, res) => {
  try {
    // ** Get the logged-in user **
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const { receiverId, message } = req.body;

    if (!message || !receiverId) {
      return res.status(400).json({ error: "Message and receiver ID are required" });
    }

    // ** Check if receiver exists **
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: "Receiver user not found" });
    }

    const maskedMessage = maskPhoneNumber(message);
    // ** Save the message in Chat model **
    const newMessage = new Chat({
      sender: new mongoose.Types.ObjectId(userId),
      receiver: new mongoose.Types.ObjectId(receiverId),
      message,
      isRead: false, // Mark as unread
    });

    await newMessage.save();
    // Mask phone numbers in the message
    // ** Store a notification in the Notification model **
    const newNotification = new Notification({
      sender: userId,
      receiver: receiverId,
      message: "You have a new message",
      type: "message",
      read: false,
    });

    await newNotification.save();

    // 🔥 Emit message via Socket.io
    const users = getUsers(); // Get the map of connected users
    const receiverSocketId = users.get(receiverId); // Get receiver's socket ID

    if (receiverSocketId) {
      req.io.to(receiverSocketId).emit("receiveMessage", {
        senderId: userId,
        message,
      });

      // 🚀 Emit notification if the user is online
      req.io.to(receiverSocketId).emit("newNotification", {
        type: "message",
        message: "You have a new message",
        senderId: userId,
      });
    } else {
      // 🚀 If the user is offline, update unread count
      await User.findByIdAndUpdate(receiverId, {
        $inc: { unreadMessages: 1 },
      });
      console.log(`📩 User ${receiverId} is offline. Unread messages count updated.`);
    }

    res.status(200).json(newMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Something went wrong while sending the message" });
  }
};


// Fetch chat history
export const getChatHistory = async (req, res) => {
  try {
    const {userId } = req.params; // The ID of the user the chat is with
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUserId = decoded.userId;
    const chatHistory = await Chat.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId },
      ],
    }).sort({ createdAt: 1 });

    res.status(200).json(chatHistory);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Something went wrong while fetching chat history" });
  }
};


export const markMessagesAsRead = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const { senderId } = req.body; // Sender of the unread messages

    if (!senderId) {
      return res.status(400).json({ error: "Sender ID is required" });
    }

    // Update all unread messages from the sender to the logged-in user
    await Chat.updateMany(
      { sender: senderId, receiver: userId, read: false },
      { $set: { read: true } }
    );

    res.json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


export const resetUnreadMessages = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const loggedInUserId = decoded.userId; // Logged-in user ID
    const { senderId } = req.body; // Get sender ID from request body

    console.log(`🔄 Resetting unread messages from sender: ${senderId} for user: ${loggedInUserId}`);

    // **Find all unread messages from this sender**
    const unreadMessages = await Chat.find({
      sender: senderId,
      receiver: loggedInUserId,
      // read: false,
    });
    const unreadCount = unreadMessages.length; // Count of unread messages

    if (unreadCount === 0) {
      return res.status(200).json({ message: "No unread messages to reset" });
    }
// const check = await Chat.find({sender: senderId, receiver: loggedInUserId, });
    // **Reduce unread count in User model**
    await User.findByIdAndUpdate(loggedInUserId, {
      $inc: { unreadMessages: -unreadCount },
    });

    res.status(200).json({ message: "Unread messages reset" });
  } catch (error) {
    console.error("❌ Error resetting unread messages:", error);
    res.status(500).json({ error: "Unable to reset unread messages" });
  }
};


export const getUnreadMessageCount = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Count unread messages where the logged-in user is the receiver
    const unreadMessages = await Chat.countDocuments({
      receiver: userId,
      read:false
    });
    res.json({ unreadMessages });
  } catch (error) {
    console.error("Error fetching unread messages:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


// Fetch message history between two users
export const getMessageHistory = async (req, res) => {
  try {
    const { receiverId } = req.params;

    const messages = await Chat.find({
      $or: [
        { sender: req.user.userId, receiver: receiverId },
        { sender: receiverId, receiver: req.user.userId },
      ],
    }).sort({ timestamp: 1 }); // Sort messages by timestamp ascending

    res.status(200).json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to fetch message history' });
  }
};

export const getMessageNotifications = async (req, res) => {
  try {
    // Get user ID from JWT token
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Fetch unread messages where the logged-in user is the receiver
    const unreadMessages = await Chat.find({ receiver: userId, read: false })
      .populate("sender", "name") // Populate sender's name
      .sort({ createdAt: -1 }) // Sort by latest messages first
      .limit(10); // Limit to the last 10 notifications

    // Format the response to include sender name & message preview
    const notifications = unreadMessages.map((msg) => ({
      senderName: msg.sender.name,
      messagePreview: msg.message.length > 30 ? msg.message.substring(0, 30) + "..." : msg.message, // Show only the first 30 chars
      timestamp: msg.createdAt,
    }));

    res.status(200).json({ notifications });
  } catch (error) {
    console.error("❌ Error fetching message notifications:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};