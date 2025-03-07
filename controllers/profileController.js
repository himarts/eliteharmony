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
    const user = await User.findById(userId).select("-password -email -phoneNumber"); // Exclude the password, email, and phone number fields
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Server error" });
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
    const token = req.headers.authorization.split(' ')[1]; // Assuming the token is sent in the Authorization header
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { file } = req; // Access the uploaded file via req.file
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    // Upload to Cloudinary with userId as part of the file name
    const uploadedFile = await uploadImage(file.path, { public_id: `profile_pictures/${userId}_${Date.now()}` });
    const profilePicture = uploadedFile.secure_url; // Get the secure URL

    // Update the user's profile with the Cloudinary URL
    const user = await User.findByIdAndUpdate(
      userId,
      { profilePicture },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "Profile picture updated", profilePicture: user.profilePicture });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    res.status(500).json({ error: "Server error" });
  }
};

//get online users

export const getOnlineUsers = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1]; // Assuming the token is sent in the Authorization header
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const loggedInUserId = decoded.userId;

    // ✅ Only allow authenticated users
    const users = await User.find({ onlineStatus: "online" });// Include only username and onlineStatus

    if (users.length === 0) return res.status(400).json({ error: "No online users found" });

    // Filter out the logged-in user
    const filteredUsers = users.filter(user => user._id.toString() !== loggedInUserId);

    return res.status(200).json(filteredUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// ✅ Get List of Friends from Matches and Check Online Status
export const getFriendsStatus = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1]; // Assuming the token is sent in the Authorization header
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Find the user and populate their matches
    const user = await User.findById(userId).populate('matches', 'username onlineStatus');
    if (!user) return res.status(404).json({ error: "User not found" });

    // Get the user details for each match
    const friendsStatus = await Promise.all(user.matches.map(async match => {
      const friend = await User.findById(match._id).select('name onlineStatus');
      return {
        username: friend.name,
        onlineStatus: friend.onlineStatus
      };
    }));

    res.status(200).json({ success: true, friends: friendsStatus });
  } catch (error) {
    console.error("Error fetching friends status:", error);
    res.status(500).json({ error: "Server error" });
  }
};

//get list of friends from matches and also check if they are online of offline

