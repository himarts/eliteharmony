import User from "../models/user.js";
import bcrypt from "bcryptjs";
import Joi from "joi";
import moment from 'moment';
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';
import { sendVerificationEmail, sendResetPasswordEmail  } from "../services/emailService.js";
import { generateVerificationCode } from "../utils/verificationCode.js";
  // controllers/authController.js
  import { generateOtp } from '../utils/otp.js';


dotenv.config()


// User Registration
export const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ error: "User already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate Verification Code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create User
    user = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      verificationCode
    });

    await user.save();

    // Send verification email
    await sendVerificationEmail(email, verificationCode);

    res.status(201).json({ message: "User registered. Check email for verification code." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verify User
export const verifyUser = async (req, res) => {
  try {
    const { email, verificationCode } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    if (user.verificationCode !== verificationCode) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    user.isVerified = true;
    user.verificationCode = null; 
    await user.save();

    res.json({ message: "User verified successfully." });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

export const loginUser = async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
  
      if (!user) return res.status(400).json({ error: "Invalid email or password" });
  
      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ error: "Invalid email or password" });
  
      if (!user.isVerified) return res.status(400).json({ error: "Please verify your account first" });
  
      // Generate JWT Token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  
      res.json({ message: "Login successful", token});
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  };
  
  // ✅ Forgot Password (Send Reset Code)
  export const forgotPassword = async (req, res) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });
  
      if (!user) return res.status(400).json({ error: "User not found" });
  
      // Generate Reset Code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.verificationCode = resetCode;
      const token = jwt.sign({ email: email }, process.env.JWT_SECRET, { expiresIn: "7d" });

      await user.save();
  
      // Send reset code via email
      await sendResetPasswordEmail(email, resetCode);
  
      res.json({ message: "Password reset code sent to email", token: token});
    } catch (error) {
      res.status(500).json({ error: "Server error" });
    }
  };
  
  // ✅ Reset Password

  export const resetPassword = async (req, res) => {
    try {
      const { token, newPassword } = req.body;
  
      if (!token) {
        return res.status(400).json({ error: "Reset token is required" });
      }
  
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }
  
      // Verify and decode the reset token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET); // Use a dedicated secret for reset tokens
      } catch (error) {
        return res.status(401).json({ error: "Invalid or expired reset token" });
      }
  
      const { email } = decoded;
  
      // Find the user by email
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      // Hash new password and update user record
      user.password = await bcrypt.hash(newPassword, 10);
      user.verificationCode = null; // Clear any reset code if stored
      await user.save();
  
      res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Password Reset Error:", error);
      res.status(500).json({ error: "Server error" });
    }
  };
  

  export const resendVerificationCode = async (req, res) => {
    // Validate input
    const schema = Joi.object({
      email: Joi.string().email().required()
    });
  
    const { error } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });
  
    try {
      const user = await User.findOne({ email: req.body.email });
  
      if (!user) return res.status(404).json({ message: 'User not found.' });
      if (user.isVerified) return res.status(400).json({ message: 'User is already verified.' });
  
      // Prevent frequent requests
      if (user.verificationExpires && moment(user.verificationExpires).isAfter(moment())) {
        return res.status(400).json({ message: 'Please wait before requesting another code.' });
      }
  
      // Generate and save new verification code
      const newCode = generateVerificationCode();
      user.verificationCode = newCode;
      user.verificationExpires = moment().add(10, 'minutes').toDate();
      await user.save();
  
      // Send verification email
      await sendVerificationEmail(user.email, newCode);
  
      res.status(200).json({ message: 'Verification code resent successfully.' });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error.' });
    }
  };



// Store the generated OTP in memory (ideally use a database or cache system like Redis)
let otpStorage = {};

export const requestOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    // Validate phone number (e.g., regex check)
    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format.' });
    }

    // Generate OTP
    const otp = generateOtp();

    // Store OTP in memory (ideally use a database or Redis cache with an expiration time)
    otpStorage[phone] = otp;



    res.status(200).json({ message: 'OTP sent successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong while sending OTP.' });
  }
};

export const verifyOtp = (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Validate OTP
    if (!otpStorage[phoneNumber] || otpStorage[phone] !== otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    // OTP is valid; proceed with further actions (e.g., user registration, login)
    delete otpStorage[phone]; // Clear the OTP after successful verification

    res.status(200).json({ message: 'OTP verified successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong while verifying OTP.' });
  }
};

// Ensure this path matches your project structure

export const verifyResetCode = async (req, res) => {
  try {
    // Extract token from headers
    const { verificationCode,token } = req.body;

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }
    // Verify and decode token
    let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET); // Use a dedicated secret for reset tokens
      } catch (error) {
        return res.status(401).json({ error: "Invalid or expired reset token" });
      }

    // Extract email from decoded token
    const email = decoded?.email;
    if (!email) {
      return res.status(400).json({ error: "Email not found in token" });
    }
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Extract verification code from request body
    // Check if the verification code matches
    if (user.verificationCode !== verificationCode) {
      return res.status(400).json({ error: "Invalid verification code" });
    }
    // Update user verification status
    user.isVerified = true;
    user.verificationCode = null; // Clear the verification code after successful verification
    await user.save();

    res.json({ message: "User verified successfully." });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Server error" });
  }
};



  


// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find(); // Fetch all users
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users", error });
  }
};

// Delete all users
export const deleteAllUsers = async (req, res) => {
  try {
    await User.deleteMany(); // Deletes all users
    res.status(200).json({ message: "All users deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting users", error });
  }
};

export const logout = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(400).json({ error: "User not found" });

    // ✅ Mark user as offline
    user.onlineStatus = "offline";
    await user.save();

    res.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

