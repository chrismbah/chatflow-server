const express = require("express");
const cors = require("cors");
const passport = require("passport");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const http = require("http");
const socketAuth = require("./middlewares/socketAuth");
const { Server } = require("socket.io");
const globalErrorHandler = require("./middlewares/globalErrorHandler");
const invalidRoute = require("./middlewares/invalidRoute");
const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/user");
const chatRoutes = require("./routes/chat");
const messageRoutes = require("./routes/message");
const connectDB = require("./config/db");
const socketHandlers = require("./socket/socketHandlers");
require("./config/passport");
require("./config");
require("colors");


const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: process.env.CLIENT_URL ?? "http://localhost:3000",
  credentials: true,
};

app.use(logger("dev"));
app.use(express.json());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

connectDB();
// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL ?? "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket.IO authentication middleware
io.use(socketAuth);
socketHandlers(io);
app.use((req, res, next) => {
  req.io = io;
  next();
});
// io.on("connection", (socket) => {
//   console.log("New socket connection:", socket.user.id);

//   // Setup user's personal room
//   socket.join(socket.user.id);

//   socket.on("disconnect", () => {
//     console.log("Socket disconnected:", socket.user.id);
//   });
// });

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use(invalidRoute);
app.use(globalErrorHandler);

server.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${process.env.PORT}`.yellow.bold);
});

module.exports = { app, server, io };