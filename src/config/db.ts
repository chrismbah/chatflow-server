import mongoose from "mongoose";
import "./index"; // Ensure this correctly initializes necessary configurations

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI as string);
    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
  } catch (error) {
    console.error(`Error: ${error}`.red.bold);
  }
};

export default connectDB;
