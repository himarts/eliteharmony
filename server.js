import express from 'express';
import dotenv from 'dotenv';
import http from "http";
import bodyParser from 'body-parser';
import cors from 'cors';
import connectDB from './config/db.js'; // Import MongoDB connection function
import authRoutes from './routes/authRoutes.js';
import profileRoutes from "./routes/profileRoutes.js";
import likesDislikesRoutes from './routes/likesDislikesRoute.js';
import searchRoutes from './routes/searchRoutes.js';
import chatRoute from './routes/chatRoutes.js';
import User from './models/user.js';
import { protect } from './middleware/authMiddleware.js';
import notificationRoute from './routes/notificationRoutes.js';
import Chat from './models/chat.js'; // Import Chat model
import { initializeSocket, getSocket } from './services/socket.js'; // Import the socket initialization function
import { maskPhoneNumber } from './utils/maskPhone.js'; // Import the maskPhoneNumber utility function
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);


// Middleware to attach socket to requests
app.use((req, res, next) => {
  req.io = getSocket(); // Attach socket instance to req object
  next();
});

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/profiles", likesDislikesRoutes);
app.use("/api/users", searchRoutes);
app.use("/api/chats", chatRoute);
app.use('/api/notification', notificationRoute);



app.get('/', (req, res) => {
  res.send('Welcome to the EliteHarmony');
});

app.get("/check-profile",
  protect,
  async (req, res) => {
    try {
      const user = await User.findById(req.user.userId);
      console.log(user);
      if (!user) return res.status(404).json({ error: "User not found" });

      res.json({ isProfileComplete: user.isProfileComplete });
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  }
);

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => { // Change app.listen to server.listen
  console.log(`Server running on port ${PORT}`);
});
