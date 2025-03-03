const mongoose = require("mongoose");
const catchAsync = require("../utils/catchAsync");
const Chat = require("../models/Chat");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const AppResponse = require("../utils/AppResponse");
const { findDirectChat } = require("../helpers/chat");

const accessChat = catchAsync(async (req, res, next) => {
  const { userId } = req.body;
  if (!userId) return next(new AppError("User Not Found", 404));

  let isChat = findDirectChat(userId, req.user.id);
  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name avatar email",
  });
  if (isChat.length > 0) AppResponse(res, 201, isChat[0]);
  else {
    const chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user.id, userId],
    };
    const createdChat = await Chat.create(chatData);
    const fullChat = await Chat.findOne({ _id: createdChat._id })
      .populate("users", "-password")
      .select("-groupAdmins");
    AppResponse(res, 201, fullChat);
  }
});

const getAllChats = catchAsync(async (req, res, next) => {
  // Pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Fetch total count of chats (for pagination metadata)
  const totalChats = await Chat.countDocuments({
    users: { $elemMatch: { $eq: req.user.id } },
  });

  // Fetch paginated chats
  let chats = await Chat.find({
    users: { $elemMatch: { $eq: req.user.id } },
  })
    .populate("users", "-password")
    .populate("groupAdmins", "-password")
    .populate("latestMessage")
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);

  // Populate the latest message sender
  chats = await User.populate(chats, {
    path: "latestMessage.sender",
    select: "name avatar email",
  });

  // Prepare pagination metadata
  const totalPages = Math.ceil(totalChats / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return AppResponse(res, 200, {
    chats,
    pagination: {
      currentPage: page,
      totalPages,
      totalChats,
      limit,
      hasNextPage,
      hasPrevPage,
    },
  }, "Chats fetched successfully");
});

const createGroupChat = catchAsync(async (req, res, next) => {
  const { users, name } = req.body;
  // Validate required fields
  if (!users || !name) {
    return next(
      new AppError("Please provide both users and a group name.", 400)
    );
  }
  // Ensure the group has at least 2 members (excluding the creator)
  if (users.length < 2) {
    return next(
      new AppError("A group chat requires at least 2 other users.", 400)
    );
  }

  if (!users.every((user) => mongoose.Types.ObjectId.isValid(user))) {
    return next(new AppError("Invalid user ID(s) provided.", 400));
  }
  // Add the current user (creator) to the group
  const groupUsers = [...new Set([...users, req.user.id])];

  // Create the group chat
  const groupChat = await Chat.create({
    chatName: name,
    users: groupUsers,
    isGroupChat: true,
    groupAdmins: [req.user.id], // Creator is the initial admin
  });

  // Populate users and admin fields in the group chat
  const fullGroupChat = await Chat.findById(groupChat._id)
    .populate("users", "-password") // Exclude sensitive information
    .populate("groupAdmins", "-password");

  // Respond with the created group chat
  AppResponse(res, 201, fullGroupChat, "Group chat created successfully");
});

const getGroupChat = catchAsync(async (req, res, next) => {
  const { groupId } = req.params;
  if (!groupId) return next(new AppError("Group ID not found", 404));
  const groupChat = await Chat.find({
    _id: groupId,
    users: { $elemMatch: { $eq: req.user.id } },
    isGroupChat: true,
  })
    .populate("users", "-password")
    .populate("groupAdmins", "-password");
  if (!groupChat) AppResponse(res, 200, [], "No group chats found.");
  AppResponse(res, 200, groupChat, "Group Chat Fetched Successfully");
});

const getAllGroupChats = catchAsync(async (req, res) => {
  // Pagination parameters
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Fetch total count of group chats (for pagination metadata)
  const totalGroupChats = await Chat.countDocuments({
    users: { $elemMatch: { $eq: req.user.id } },
    isGroupChat: true,
  });

  // Fetch paginated group chats
  const groupChats = await Chat.find({
    users: { $elemMatch: { $eq: req.user.id } },
    isGroupChat: true,
  })
    .populate("users", "-password")
    .populate("groupAdmins", "-password")
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit);

  // If no group chats are found, return an empty array
  if (!groupChats.length) {
    return AppResponse(res, 200, [], "No group chats found.");
  }

  // Prepare pagination metadata
  const totalPages = Math.ceil(totalGroupChats / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return AppResponse(
    res,
    200,
    {
      groupChats,
      pagination: {
        currentPage: page,
        totalPages,
        totalGroupChats,
        limit,
        hasNextPage,
        hasPrevPage,
      },
    },
    "Group Chats Fetched Successfully"
  );
});

const renameGroupChat = catchAsync(async (req, res, next) => {
  const { name } = req.body;
  const { groupId } = req.params;
  if (!name || !groupId)
    return next(new AppError("Please fill in all fields", 400));
  const groupChat = await Chat.findByIdAndUpdate(
    groupId,
    { chatName: name },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmins", "-password");
  if (!groupChat) return next(new AppError("Group Chat Not Found", 404));
  AppResponse(res, 200, groupChat, "Group Chat Renamed Successfully");
});

const removeUserFromGroupChat = async (req, res, next) => {
  const { userId } = req.body;
  const { groupId } = req.params;
  const user = await User.findById(userId);
  if (!user) return next(new AppError("User Not Found", 404));
  const groupChat = await Chat.findByIdAndUpdate(
    groupId,
    {
      $pull: {
        users: userId,
      },
    },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmins", "-password");
  if (!groupChat) return next(new AppError("Group Chat Not Found", 404));
  AppResponse(res, 200, groupChat, "User Removed from Group Chat Successfully");
};

const addUserToGroupChat = catchAsync(async (req, res, next) => {
  const { users } = req.body;
  const { groupId } = req.params;
  if (!users || !groupId)
    return next(new AppError("Please Fill in all fields", 403));
  if (!users.every((user) => mongoose.Types.ObjectId.isValid(user))) {
    return next(new AppError("Invalid user ID(s) provided.", 400));
  }
  const newUsers = [...new Set([...users, req.user.id])];
  const groupChat = await Chat.findByIdAndUpdate(
    groupId,
    {
      $push: {
        users: newUsers,
      },
    },
    { new: true }
  )
    .populate("users", "-password")
    .populate("groupAdmins", "-password");
  if (!groupChat) return next(new AppError("Group Chat Not Found", 404));
  AppResponse(res, 200, groupChat, "Successfully Added User to Group");
});

module.exports = {
  accessChat,
  getAllChats,
  createGroupChat,
  getGroupChat,
  renameGroupChat,
  removeUserFromGroupChat,
  addUserToGroupChat,
  getAllGroupChats,
};
