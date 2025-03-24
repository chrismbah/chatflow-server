// import { app } from "../src/app";

// export default app;

// Minimal version for debugging
import express from "express";
import "../src/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";
// Create a simple Express app
const app = express();

// Add error handling for uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Basic middleware
app.use(express.json());
app.use(cors());
app.use(cookieParser());

// Safe MongoDB connection function
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("MongoDB URI is not defined in environment variables");
      return false;
    }

    // Set connection options with timeouts to prevent hanging
    const options = {
      serverSelectionTimeoutMS: 5000, // 5 seconds
      connectTimeoutMS: 10000, // 10 seconds
    };

    await mongoose.connect(process.env.MONGO_URI, options);
    console.log("MongoDB connected successfully");
    return true;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    return false;
  }
};

// Health check route that reports MongoDB status
app.get("/", async (req, res) => {
  // Get MongoDB connection state
  const dbState = mongoose.connection.readyState;
  const dbStatus = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.status(200).json({
    status: "ok",
    message: "API with MongoDB is running",
    nodeEnv: process.env.NODE_ENV,
    mongoDbStatus: dbStatus[dbState as 0 | 1 | 2 | 3],
    hasMongoURI: !!process.env.MONGO_URI,
  });
});

// Mock user route
app.get("/api/users", async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      message: "Database not connected",
      dbState: mongoose.connection.readyState,
    });
  }

  res
    .status(200)
    .json([{ id: "1", name: "Test User", email: "test@example.com" }]);
});

// Error handling middleware
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Global error:", err);
    res.status(500).json({
      message: "Server error",
      error: process.env.NODE_ENV === "production" ? {} : err,
    });
  }
);

// Try to connect to MongoDB but don't let it crash the app if it fails
connectDB()
  .then((success) => {
    if (success) {
      console.log("MongoDB connection initialized");
    } else {
      console.log("Running without MongoDB connection");
    }
  })
  .catch((err) => {
    console.error("Error during MongoDB initialization:", err);
  });

export default app;
