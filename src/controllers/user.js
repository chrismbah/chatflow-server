const catchAsync = require("../utils/catchAsync");
const User = require("../models/User");
const AppResponse = require("../utils/AppResponse");
const AppError = require("../utils/AppError");

const getUserProfile = catchAsync(async (req, res, next) => {
  const userId = req.user.id; // Retrieve user ID from the token data in req.user
  if (!userId) {
    return next(new AppError("User ID not found", 400));
  }
  // Fetch user data by ID
  const user = await User.findById(userId).select("-password"); // Exclude password field
  if (!user) {
    return next(new AppError("User not found", 404));
  }
  return AppResponse(res, 200, user);
});

const getAllUsers = catchAsync(async (req, res, next) => {
  const user = req.query.search
    ? {
        $or: [
          {
            name: { $regex: req.query.search, $options: "i" },
          },
          {
            email: { $regex: req.query.search, $options: "i" },
          },
        ],
      }
    : {};
  const users = await User.find(user).find({ _id: { $ne: req.user.id } });
  return AppResponse(res, 200, users);
});

module.exports = { getAllUsers, getUserProfile };
