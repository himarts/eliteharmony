import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import User from './models/User.js'; // Adjust path based on your project

dotenv.config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mydatabase';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};

// Generate Fake Users
const generateUsers = async () => {
  try {
    await User.deleteMany(); // Clear existing users
    const users = Array.from({ length: 10 }).map(() => ({
      name: faker.person.fullName(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      password: bcrypt.hashSync('password', 10), // Hashed password
      image: faker.image.avatar(), // Fake profile image
    }));

    await User.insertMany(users);
    console.log('Database Seeded Successfully!');
  } catch (error) {
    console.error('Seeding Failed:', error);
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
