const catchAsync = require("../utils/catchAsync");
const User = require("../models/User");
const AppResponse = require("../utils/AppResponse");
const AppError = require("../utils/AppError");
const { findDirectChat } = require("../helpers/chat");

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
  // Get the search query if it exists
  const userSearch = req.query.search
    ? {
        $or: [
          { name: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  // Fetch all users excluding the logged-in user
  const users = await User.find(userSearch).find({ _id: { $ne: req.user.id } });

  // Filter out users that already have a chat with the logged-in user
  const usersWithoutChat = await Promise.all(
    users.map(async (user) => {
      const chat = await findDirectChat(user._id, req.user.id);
      if (chat.length === 0) {
        return user; // Only return users without an existing chat
      }
      return null; // Exclude users with an existing chat
    })
  );

  // Filter out any null values (users that have an existing chat)
  const availableUsers = usersWithoutChat.filter((user) => user !== null);

  return AppResponse(res, 200, availableUsers);
});

module.exports = { getAllUsers, getUserProfile };
