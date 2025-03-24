// import { app } from "../src/app";

// export default app;

// Minimal version for debugging
import express from "express";
import "../src/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import mongoose from "mongoose";
import passport from "passport";
import session from "express-session";
import logger from "morgan";
import { Server } from "socket.io";
import http from "http";
import "colors";

// Import configuration & setup
import "./config";
import "./config/passport";

// Import middlewares
import globalErrorHandler from "../src/middlewares/globalErrorHandler";
import invalidRoute from "../src/middlewares/invalidRoute";

// Import routes
import authRoutes from "../src/routes/auth";
import usersRoutes from "../src/routes/user";
import chatRoutes from "../src/routes/chat";
import messageRoutes from "../src/routes/message";

// Import Socket.IO handler
import socketHandler from "../src/socket";

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: process.env.CLIENT_URL ?? "http://localhost:3000",
  credentials: true,
};

const sessionOptions = {
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: true,
};

// Basic middleware
app.use(logger("dev"));
app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());

// Safe MongoDB connection function
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("MongoDB URI is not defined in environment variables");
      return false;
    }

    // Set connection options with timeouts to prevent hanging

    await mongoose.connect(process.env.MONGO_URI);
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
// Setup API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// Root route should come after specific routes
app.get("/", (req, res) => {
  res.json("This is the root route");
});

// Error handling middlewares
app.use(invalidRoute);
app.use(globalErrorHandler);

// Setup WebSocket server
const io = new Server(server, {
  pingTimeout: 25000,
  cors: {
    origin: process.env.CLIENT_URL ?? "http://localhost:3000",
    credentials: true,
  },
});

socketHandler(io);

// Only start the server if not running in Vercel
if (process.env.NODE_ENV !== "production") {
  server.listen(process.env.PORT ?? 5000, () => {
    console.log(
      `Server listening on port ${process.env.PORT ?? 5000}`.yellow.bold
    );
  });
}

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

export default server;
