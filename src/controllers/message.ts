import Chat from "../models/Chat";
import Message from "../models/Message";
import AppResponse from "../utils/AppResponse";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { AuthenticatedRequest } from "../types";
import { NextFunction, Response } from "express";

const sendMessage = catchAsync(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { chatId, content } = req.body;

    if (!req.user) {
      return next(new AppError("Not authenticated", 401));
    }

    // Validate input
    if (!chatId || !content) {
      return next(new AppError("Chat ID and content are required", 400));
    }

    // Check if chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return next(new AppError("Chat not found", 404));
    }

    // Check if user is part of the chat
    if (!chat.users.includes(req.user.id)) {
      return next(
        new AppError("Unauthorized to send message in this chat", 403)
      );
    }

    // Create message
    const newMessage = await Message.create({
      sender: req.user.id,
      content,
      chat: chatId,
    });

    // Update latest message in chat
    await Chat.findByIdAndUpdate(chatId, { latestMessage: newMessage });

    // **Step 1: First, retrieve the message separately**
    const message = await Message.findById(newMessage._id);
    if (!message) {
      return next(new AppError("Message not found after creation", 404));
    }

    // **Step 2: Populate fields only if the message exists**
    await message.populate("sender", "fullName avatar");
    await message.populate({
      path: "chat",
      populate: [
        { path: "users", select: "fullName avatar email" },
        {
          path: "latestMessage",
          select: "_id sender content createdAt",
          populate: { path: "sender", select: "fullName avatar" },
        },
      ],
    });

    // Respond with the message including populated chat info
    AppResponse(res, 201, message, "Message sent successfully");
  }
);

const getMessagesByChatId = catchAsync(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { chatId } = req.query;
    if (!req.user) {
      return next(new AppError("Not authenticated", 401));
    }
    // Check if chat exists
    if (!chatId) next(new AppError("Chat Id invalid", 403));
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return next(new AppError("Chat not found", 404));
    }

    // Check if user is part of the chat
    if (!chat.users.includes(req.user.id)) {
      return next(
        new AppError("Unauthorized to view messages in this chat", 403)
      );
    }

    // Fetch messages, sorted by creation time
    const messages = await Message.find({ chat: chatId })
      .populate("sender", "fullName avatar")
      .sort({ createdAt: 1 });

    // Respond with messages
    AppResponse(res, 200, messages, "Messages retrieved successfully");
  }
);

const deleteMessage = catchAsync(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { messageId } = req.params;

    if (!req.user) {
      return next(new AppError("Not authenticated", 401));
    }
    const message = await Message.findById(messageId);
    if (!message) return next(new AppError("Message not found", 404));

    if (message.sender.toString() !== req.user.id) {
      return next(new AppError("You can only delete your own messages", 403));
    }

    await message.deleteOne();

    AppResponse(res, 200, null, "Message deleted successfully");
  }
);

const markMessagesAsRead = catchAsync(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Not authenticated", 401));
    }
    const { chatId } = req.body;
    if (!chatId) next(new AppError("Chat Id invalid", 403));
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return next(new AppError("Chat not found", 404));
    }
    // Find all unread messages in this chat that the user hasn't read
    const messages = await Message.find({
      chat: chatId,
      readBy: { $ne: req.user.id }, // Only update if user hasn't read it
    });
    if (messages.length === 0) {
      return AppResponse(res, 200, null, "No unread messages found");
    }
    // Mark messages as read by adding the user to the `readBy` array
    await Message.updateMany(
      { _id: { $in: messages.map((msg) => msg._id) } },
      { $addToSet: { readBy: req.user.id } } // Prevents duplicates
    );
    return AppResponse(res, 200, null, "Messages marked as read");
  }
);

export { sendMessage, getMessagesByChatId, markMessagesAsRead, deleteMessage };
