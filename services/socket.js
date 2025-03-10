import { Server } from "socket.io";
import User from "../models/user.js"; // Import User model for unread count updates

let io;
const users = new Map(); // Stores userId -> socketId

export const initializeSocket = (server) => {
  if (!io) {
    io = new Server(server, {
      cors: {
        origin: "http://localhost:5173", // Match frontend
        methods: ["GET", "POST"],
      }
    });

    io.on("connection", async (socket) => {
      console.log(`✅ User connected: ${socket.id}`);

      // **🔥 Register user when they come online**
      socket.on("user-online", async (userId) => {
        users.set(userId, socket.id);
        console.log(`✅ User ${userId} registered with socket ID: ${socket.id}`);

        // 🚀 Send unread message count when user comes online
        const user = await User.findById(userId);
        if (user) {
          socket.emit("unreadMessageCount", user.unreadMessages);
        }
      });

      // **📩 Handle sending messages**
      socket.on("send-message", async ({ senderId, receiverId, message }) => {
        console.log(`🔥 Sending message from ${senderId} to ${receiverId}: ${message}`);

        const receiverSocketId = users.get(receiverId); // Get receiver's socket ID

        if (receiverSocketId) {
          console.log(`📩 Emitting message to receiver: ${receiverSocketId}`);
          io.to(receiverSocketId).emit("receive-message", {
            senderId,
            receiverId,
            message,
          });
        } else {
          console.log(`❌ Receiver ${receiverId} is offline. Incrementing unread count.`);
          await User.findByIdAndUpdate(receiverId, { $inc: { unreadMessages: 1 } });
        }
      });

      // **📩 Reset unread messages when chat is opened**
      socket.on("reset-unread-messages", async (userId) => {
        await User.findByIdAndUpdate(userId, { unreadMessages: 0 });
        console.log(`🗑️ Reset unread messages for user ${userId}`);
      });

      // 📌 Handle likes
      socket.on("like-profile", ({ likerId, likedUserId }) => {
        console.log(`👍 User ${likerId} liked ${likedUserId}`);

        const receiverSocketId = users.get(likedUserId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("profile-liked", { likerId, likedUserId });
        }
      });

      // 📌 Handle dislikes
      socket.on("dislike-profile", ({ dislikerId, dislikedUserId }) => {
        console.log(`👎 User ${dislikerId} disliked ${dislikedUserId}`);

        const receiverSocketId = users.get(dislikedUserId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("profile-disliked", { dislikerId, dislikedUserId });
        }
      });

      // **❌ Handle disconnection**
      socket.on("disconnect", () => {
        for (let [userId, socketId] of users.entries()) {
          if (socketId === socket.id) {
            users.delete(userId);
            console.log(`❌ User ${userId} disconnected`);
            break;
          }
        }
      });
    });
  }
};

export const getSocket = () => io;
export const getUsers = () => users;
