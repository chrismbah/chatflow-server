// import { app } from "../src/app";

// export default app;


// Minimal version for debugging
import express from "express";
import "../src/config"
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();

// Add error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Basic middleware - similar to your original app but without DB-dependent features
app.use(express.json());
app.use(cors());
app.use(cookieParser());

// Simple routes to test API functionality
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Simplified API is running',
    nodeEnv: process.env.NODE_ENV
  });
});

// Mock auth route
app.get('/api/auth/status', (req, res) => {
  res.status(200).json({ isAuthenticated: false });
});

// Mock users route
app.get('/api/users', (req, res) => {
  res.status(200).json([
    { id: '1', name: 'Test User', email: 'test@example.com' }
  ]);
});

// Handle 404s
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error:', err);
  res.status(500).json({ 
    message: 'Server error', 
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

export default app;