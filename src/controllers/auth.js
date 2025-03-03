const catchAsync = require("../utils/catchAsync");
const User = require("../models/User");
const { generateToken, setTokenCookie } = require("../utils/token");
const AppError = require("../utils/AppError");
const AppResponse = require("../utils/AppResponse");
require("../config");

const registerUser = catchAsync(async (req, res, next) => {
  const { fullName, email, password, avatar } = req.body;
  if (!fullName || !email || !password) {
    next(new AppError("Please enter all fields", 400));
  }
  const userExists = await User.findOne({ email });
  if (userExists) {
    next(new AppError("User already exists", 400));
  }
  const user = await User.create({
    fullName,
    email,
    password,
    avatar,
  });
  user.password = undefined;
  if (!user) return next(new AppError("Failed to create user", 500));

  AppResponse(res, 201, user, "Registeration successful");
});

const loginUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError("Invalid email or password", 404));
  }
  if (user.provider === "google") {
    return next(
      new AppError("Please log in using Google, not with email/password", 400)
    );
  }
  if (user && (await user.matchPassword(password))) {
    const token = generateToken(user._id);
    setTokenCookie(res, token);
    user.password = undefined;
    return AppResponse(res, 200, user, "Login successful");
  }

  next(new AppError("Invalid email and password", 400));
});

module.exports = { registerUser, loginUser };
