const catchAsync = require("../utils/catchAsync");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const AppError = require("../utils/AppError");
const AppResponse = require("../utils/AppResponse");

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

  if (user)
    AppResponse(
      res,
      201,
      {
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          avatar: user.avatar,
          token: generateToken(user._id),
          isAdmin: user.isAdmin,
        },
      },
      "Registeration successful"
    );
});

const loginUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user && (await user.matchPassword(password))) {
    AppResponse(
      res,
      200,
      {
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          avatar: user.avatar,
          token: generateToken(user._id),
          isAdmin: user.isAdmin,
        },
      },
      "Login successful"
    );
  } else {
    next(new AppError("Invalid email or password", 400));
  }
});

module.exports = { registerUser, loginUser };
