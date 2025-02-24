import dotenv from 'dotenv';
import mongoose from 'mongoose';
import seeder from 'mongoose-seed';
import bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';

// Load environment variables
dotenv.config();
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mydatabase';

// Generate fake users
const users = Array.from({ length: 10 }).map(() => ({
  name: faker.person.fullName(),
  email: faker.internet.email(),
  phone: faker.phone.number(),
  password: bcrypt.hashSync('password', 10), // Hashing the password
  image: faker.image.avatar(), // Fake image URL
}));

// User schema for seeding
const userSchema = {
  model: 'User',
  documents: users,
};

// Seed database
const seedDatabase = async () => {
  try {
    seeder.connect(MONGO_URI, () => {
      seeder.loadModels(['../models/User.js']); // Adjust path if necessary
      seeder.clearModels(['User'], () => {
        seeder.populateModels([userSchema], () => {
          console.log('Database Seeded Successfully!');
          seeder.disconnect();
        });
      });
    });
  } catch (error) {
    console.error('Seeding failed:', error);
  }
};

seedDatabase();
