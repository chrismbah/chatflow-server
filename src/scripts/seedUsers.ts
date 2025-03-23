import mongoose from "mongoose";
import { faker } from "@faker-js/faker";
import User from "../models/User"; // Adjust the path to your User model
import "../config";
const MONGO_URI = process.env.MONGO_URI;

const seedUsers = async () => {
  try {
    await mongoose.connect(MONGO_URI as string);
    console.log("Connected to MongoDB");

    let users = [];

    for (let i = 0; i < 100; i++) {
      users.push({
        fullName: faker.person.fullName(),
        email: faker.internet.email(),
        avatar: faker.image.avatar(),
        password: faker.internet.password(),
        isOnline: faker.datatype.boolean(),
        lastActive: faker.date.recent(),
      });
    }

    await User.insertMany(users);
    console.log("Database seeded with test users!");

    mongoose.connection.close();
  } catch (error) {
    console.error("Error seeding database:", error);
    mongoose.connection.close();
  }
};

seedUsers();
