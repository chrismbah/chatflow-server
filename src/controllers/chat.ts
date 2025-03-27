import mongoose from "mongoose";
import catchAsync from "../utils/catchAsync";
import Chat from "../models/Chat";
import User from "../models/User";
import AppError from "../utils/AppError";
import AppResponse from "../utils/AppResponse";
import { findDirectChat } from "../helpers/chat";
import { AuthenticatedRequest } from "../types";
import { NextFunction, Response } from "express";
const accessChat = catchAsync(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { userId } = req.body as { userId: string };

    // Check if user is authenticated
    if (!req.user) {
      return next(new AppError("Not authenticated", 401));
    }

    if (!userId) return next(new AppError("User Not Found", 404));

    // Assuming findDirectChat returns Promise<IChat[]> or similar
    let isChat = await findDirectChat(userId, req.user.id);

    // Now populate the result
    const populatedChat = await User.populate(isChat, {
      path: "latestMessage.sender",
      select: "name avatar email",
    });

    if (populatedChat.length > 0) {
      AppResponse(res, 201, populatedChat[0]);
    } else {
      const chatData = {
        chatName: "sender",
        isGroupChat: false,
        users: [req.user.id, userId],
      };
      const createdChat = await Chat.create(chatData);
      const fullChat = await Chat.findOne({ _id: createdChat._id })
        .populate("users", "-password")
        .select("-groupAdmins");
      // io.emit("new_chat_created", { chatId: createdChat._id });

      AppResponse(res, 201, fullChat);
    }
  }
);

const getAllChats = catchAsync(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      return next(new AppError("Not authenticated", 401));
    }

    /*
    // Pagination parameters
    const page = parseInt((req.query.page as string) || "1") || 1;
    const limit = parseInt((req.query.limit as string) || "10") || 10;
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
    chats = await Chat.populate(chats, {
      path: "latestMessage.sender",
      select: "name avatar email",
    });

    // Prepare pagination metadata
    const totalPages = Math.ceil(totalChats / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    */

    // Fetch all chats without pagination
    let chats = await Chat.find({
      users: { $elemMatch: { $eq: req.user.id } },
    })
      .populate("users", "-password")
      .populate("groupAdmins", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 });

    // Populate the latest message sender
    chats = await Chat.populate(chats, {
      path: "latestMessage.sender",
      select: "name avatar email",
    });

    return AppResponse(res, 200, chats, "Chats fetched successfully");
  }
);

const createGroupChat = catchAsync(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      return next(new AppError("Not authenticated", 401));
    }

    const { users, name } = req.body as { users: string[]; name: string };
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
  }
);

const getGroupChat = catchAsync(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      return next(new AppError("Not authenticated", 401));
    }

    const { groupId } = req.params as { groupId: string };
    if (!groupId) return next(new AppError("Group ID not found", 404));
    const groupChat = await Chat.find({
      _id: groupId,
      users: { $elemMatch: { $eq: req.user.id } },
      isGroupChat: true,
    })
      .populate("users", "-password")
      .populate("groupAdmins", "-password");

    if (!groupChat || groupChat.length === 0) {
      return AppResponse(res, 200, [], "No group chats found.");
    }

    AppResponse(res, 200, groupChat, "Group Chat Fetched Successfully");
  }
);

const getAllGroupChats = catchAsync(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      return next(new AppError("Not authenticated", 401));
    }

    // Pagination parameters
    const page = parseInt((req.query.page as string) || "1") || 1;
    const limit = parseInt((req.query.limit as string) || "10") || 10;
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
  }
);

const renameGroupChat = catchAsync(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      return next(new AppError("Not authenticated", 401));
    }

    const { name } = req.body as { name: string };
    const { groupId } = req.params as { groupId: string };
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
  }
);

const removeUserFromGroupChat = catchAsync(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      return next(new AppError("Not authenticated", 401));
    }

    const { userId } = req.body as { userId: string };
    const { groupId } = req.params as { groupId: string };
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
    AppResponse(
      res,
      200,
      groupChat,
      "User Removed from Group Chat Successfully"
    );
  }
);

const addUserToGroupChat = catchAsync(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      return next(new AppError("Not authenticated", 401));
    }

    const { users } = req.body as { users: string[] };
    const { groupId } = req.params as { groupId: string };
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
  }
);

export {
  accessChat,
  getAllChats,
  createGroupChat,
  getGroupChat,
  renameGroupChat,
  removeUserFromGroupChat,
  addUserToGroupChat,
  getAllGroupChats,
};
