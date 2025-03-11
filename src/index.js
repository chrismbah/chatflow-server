const express = require("express");
const cors = require("cors");
const passport = require("passport");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const http = require("http");
const { Server } = require("socket.io");
const globalErrorHandler = require("./middlewares/globalErrorHandler");
const invalidRoute = require("./middlewares/invalidRoute");
const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/user");
const chatRoutes = require("./routes/chat");
const messageRoutes = require("./routes/message");
const connectDB = require("./config/db");
const socketHandler = require("./socket/socketHandler")
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
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
app.use(invalidRoute);
app.use(globalErrorHandler);

const io = new Server(server, {
  pingTimeout: 25000,
  cors: {
    origin: process.env.CLIENT_URL ?? "http://localhost:3000",
    credentials: true,
  },
});

socketHandler(io);

server.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${process.env.PORT}`.yellow.bold);
});
