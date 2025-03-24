import express from "express";
import mongoose from "mongoose";

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Create Express app
const app = express();

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MongoDB URI is not defined");
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    // Don't exit process in production/serverless environment
    if (process.env.NODE_ENV === 'development') {
      process.exit(1);
    }
  }
};

// Health check route
app.get('/', async (req, res) => {
  try {
    // Check database connection
    const dbState = mongoose.connection.readyState;
    const dbStatus = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting"
    };
    
    res.status(200).json({ 
      status: 'ok', 
      message: 'API with DB connection is running',
      nodeEnv: process.env.NODE_ENV,
      dbStatus: dbStatus[dbState as 0 | 1 | 2 | 3],
      hasMongoURI: !!process.env.MONGODB_URI,
      hasSessionSecret: !!process.env.SESSION_SECRET
    });
  } catch (error) {
    console.error("Error in health check route:", error);
    res.status(500).json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Initialize database connection
connectDB().catch(err => console.error("Initial DB connection failed:", err));

export default app;