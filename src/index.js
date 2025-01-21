const express = require("express");
const cors = require("cors");
const passport = require("passport");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
require("colors");

const globalErrorHandler = require("./middlewares/globalErrorHandler");
const invalidRoute = require("./middlewares/invalidRoute");
const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/user");
const chatRoutes = require("./routes/chat");
const connectDB = require("./config/db");
require("./config/passport");
require("./config");

const app = express();

const corsOptions = {
  origin: process.env.CLIENT_URL ?? "http://localhost:3000", // Allow your frontend's origin
  credentials: true, // Allow cookies to be sent
};
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

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/chat", chatRoutes);
app.use(invalidRoute);
app.use(globalErrorHandler);
app.use(logger("dev"));

app.listen(process.env.PORT, () => {
  console.log(`Server listening on port ${process.env.PORT}`.yellow.bold);
});
