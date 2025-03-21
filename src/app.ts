import express from "express";
import passport from "passport";
import session from "express-session";
import cookieParser from "cookie-parser";
import logger from "morgan";
import { Server } from "socket.io";
import cors from "cors";
import http from "http";
import "colors";

// Import configuration & setup
import "./config";
import "./config/passport";
import connectDB from "./config/db";

// Import middlewares
import globalErrorHandler from "./middlewares/globalErrorHandler";
import invalidRoute from "./middlewares/invalidRoute";

// Import routes
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/user";
import chatRoutes from "./routes/chat";
import messageRoutes from "./routes/message";

// Import Socket.IO handler
import socketHandler from "./socket";

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

app.use(logger("dev"));
app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(session(sessionOptions));
app.use(passport.initialize());
app.use(passport.session());

// Connect to database
connectDB();

// Setup API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

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

// Start the server
server.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${process.env.PORT}`.yellow.bold);
});

export { server };
