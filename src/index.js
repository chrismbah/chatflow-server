const express = require("express");
const cors = require("cors");
const passport = require("passport");
const session = require("express-session");
require("colors");

const globalErrorHandler = require("./middlewares/globalErrorHandler");
const invalidRoute = require("./middlewares/invalidRoute");
const authRoutes = require("./routes/auth");
const { PORT, SESSION_SECRET  } = require("./config");
const connectDB = require("./config/db");
require("./config/passport");

const app = express();

app.use(express.json());
app.use(cors());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

connectDB();

app.use("/api/auth", authRoutes);
app.use(invalidRoute);
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`.yellow.bold);
});
