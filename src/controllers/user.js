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
  // Pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Get the search query if it exists
  const userSearch = req.query.search
    ? {
        $or: [
          { fullName: { $regex: req.query.search, $options: "i" } },
          { email: { $regex: req.query.search, $options: "i" } },
        ],
      }
    : {};

  // Fetch all users matching the search query, excluding the logged-in user
  const allUsers = await User.find({
    ...userSearch,
    _id: { $ne: req.user.id },
  }).select("-password");

  // Filter out users that already have a chat with the logged-in user
  const availableUsers = await Promise.all(
    allUsers.map(async (user) => {
      const chat = await findDirectChat(user._id, req.user.id);
      if (chat.length === 0) {
        return user; // Only return users without an existing chat
      }
      return null; // Exclude users with an existing chat
    })
  );

  // Remove null values (users that have an existing chat)
  const filteredUsers = availableUsers.filter((user) => user !== null);

  // Apply pagination to the filtered users
  const paginatedUsers = filteredUsers.slice(skip, skip + limit);

  // Prepare pagination metadata
  const totalUsers = filteredUsers.length; // Total users after filtering
  const totalPages = Math.ceil(totalUsers / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return AppResponse(res, 200, {
    users: paginatedUsers,
    pagination: {
      currentPage: page,
      totalPages,
      totalUsers,
      limit,
      hasNextPage,
      hasPrevPage,
    },
  });
});

module.exports = { getAllUsers, getUserProfile };
