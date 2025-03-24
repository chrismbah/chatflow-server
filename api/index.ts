// import { app } from "../src/app";

// export default app;

// Minimal version for debugging
import express, { Application, Response, Request } from "express";
import "../src/config"
// Create a simple Express app
const app: Application = express();

// Add error handling for uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Simple health check route
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    message: "Debug API is running",
    nodeEnv: process.env.NODE_ENV,
    hasMongoURI: !!process.env.MONGO_URI,
    hasSessionSecret: !!process.env.SESSION_SECRET,
  });
});

// Export a simple Express app
export default app;
