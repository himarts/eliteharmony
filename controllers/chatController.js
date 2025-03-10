import Chat from '../models/chat.js';
import User from '../models/user.js';
import { maskPhoneNumber } from '../utils/maskPhone.js';
import { getUsers } from '../services/socket.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Send message and notify in real-time
export const sendMessage = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const { receiverId, message } = req.body;

    if (!message || !receiverId) {
      return res.status(400).json({ error: "Message and receiver ID are required" });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: "Receiver user not found" });
    }

    // Mask phone numbers in the message
    const maskedMessage = maskPhoneNumber(message);

    // Save message in the database
    const newMessage = new Chat({
      sender: new mongoose.Types.ObjectId(userId),
      receiver: new mongoose.Types.ObjectId(receiverId),
      message: maskedMessage,
      isRead: false, // Mark as unread initially
      
    });

    await newMessage.save();

    // 🔥 Emit message via Socket.io
    const users = getUsers(); // Get the map of connected users
    const receiverSocketId = users.get(receiverId); // Get receiver's socket ID

    if (receiverSocketId) {
      req.io.to(receiverSocketId).emit("receiveMessage", {
        senderId: userId,
        message: maskedMessage,
      });
    } else {
      // 🚀 If the user is offline, increment unread count
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


export const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.body; // messageId to be marked as read

    const message = await Chat.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if the current user is the receiver
    if (message.receiver.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'You are not the receiver of this message' });
    }

    // Mark message as read
    message.read = true;
    await message.save();

    res.status(200).json({ message: 'Message marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong while marking the message as read' });
  }
};

export const resetUnreadMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const use = await User.findByIdAndUpdate(userId, { unreadMessages: 0 });
    console.log(use)
    res.status(200).json({ message: "Unread messages reset" });
  } catch(error) {
     console.error(error);
      res.status(500).json({ error: 'Unable to fetch unread messages count' });
    
  }
}

export const getUnreadMessageCount = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Count unread messages where the logged-in user is the receiver
    const unreadMessages = await Chat.countDocuments({
      receiver: userId,
    });
console.log(unreadMessages)
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
