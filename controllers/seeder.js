import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';
import User from '../models/User.js'; // Adjust path based on your project
import connectDB from '../config/db.js';

dotenv.config();

// Generate Fake Users
const generateUsers = async () => {
  try {
    await User.deleteMany(); // 
    const pass = "password"

        const hashedPassword = await bcrypt.hash(pass, 10);
    // Clear existing users
    const users = Array.from({ length: 20 }).map(() => ({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      isVerified:true,
      onlineStatus:"online",
      verificationStatus:"verified",
      password:  hashedPassword,// Hashed password
      profilePicture: faker.image.avatar(), // Fake profile image
    }));

    await User.insertMany(users);
    console.log('Database Seeded Successfully!');
  } catch (error) {
    if (error.name === 'MongoServerError' && error.code === 13) {
      console.error('Permission Error: Ensure your MongoDB user has the necessary permissions.');
    } else {
      console.error('Seeding Failed:', error);
    }
  } finally {
    mongoose.connection.close();
  }
};

// Run Seeder
const seedDatabase = async () => {
  await connectDB();
  await generateUsers();
};

seedDatabase();
