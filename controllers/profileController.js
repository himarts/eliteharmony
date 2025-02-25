import User from "../models/user.js";
import { uploadImage } from "../services/cloudinaryService.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// ✅ Get User Profile
export const getProfile = async (req, res) => {

  try {
    const token = req.headers.authorization.split(' ')[1]; // Assuming the token is sent in the Authorization header
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const user = await User.findById(userId)
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Server error12" });
  }
};

// ✅ Update User Profile
export const updateProfile = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1]; // Assuming the token is sent in the Authorization header
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;
    const {profileData} = req.body;
    const userExist = await User.findById(userId);
    if (!userExist) return res.status(404).json({ message: "User not found" });

    try {
      const updatedProfile = await User.findByIdAndUpdate(userId, profileData, { new: true });
      if (!updatedProfile) return res.status(404).json({ message: "User not found" });
  
      res.status(200).json(updatedProfile);
    } catch (error) {
      res.status(500).json({ message: "Error updating profile" });
    }
  } catch (error) {
    res.status(500).json({ error: "Server error13" });
  }
};

// ✅ View Other User Profiles
export const viewUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password -verificationCode");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Server error14" });
  }
};

// ✅ Update Profile Picture
export const updateProfilePicture = async (req, res) => {
    try {
      const { file } = req.files; // Assuming the file is sent as part of multipart form data
  
      if (!file) return res.status(400).json({ error: "No file uploaded" });
  
      const uploadedFile = await uploadImage(file.path); // Upload to Cloudinary
      const profilePicture = uploadedFile.secure_url; // Get the secure URL
  
      // Update the user's profile with the Cloudinary URL
      const user = await User.findByIdAndUpdate(
        req.user.userId,
        { profilePicture },
        { new: true }
      );
  
      if (!user) return res.status(404).json({ error: "User not found" });
  
      res.json({ message: "Profile picture updated", profilePicture: user.profilePicture });
    } catch (error) {
      res.status(500).json({ error: "Server error15" });
    }
  };
  
  //get online users

  export const getOnlineUsers = async (req, res) => {
    try {
      // ✅ Only allow authenticated users
      const users = await User.find({ onlineStatus: "online" }).select("-password");
      
      if (users.length === 0) return res.status(400).json({ error: "No online users found" });
  
      return res.status(200).json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  };
  