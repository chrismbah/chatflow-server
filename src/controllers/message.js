const Message = require("../models/Message");
const Chat = require("../models/Chat");
const User = require("../models/User");
const AppResponse = require("../utils/AppResponse");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

const sendMessage = catchAsync(async (req, res, next) => {
  const { chatId, content } = req.body;

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
    return next(new AppError("Unauthorized to send message in this chat", 403));
  }

  // Create message
  let message = await Message.create({
    sender: req.user.id,
    content,
    chat: chatId,
  });

  // Populate sender details
  message = await message.populate("sender", "fullName avatar");
  message = await message.populate("chat");
  message = await User.populate(message, {
    path: "chat.users",
    select: "fullName avatar email",
  });

  // Update latest message in chat
  await Chat.findByIdAndUpdate(chatId, {
    latestMessage: message,
  });
  message = await Chat.populate(message, {
    path: "chat.latestMessage",
  });

  // Respond with created message
  AppResponse(res, 201, message, "Message sent successfully");
});

const getMessagesByChatId = catchAsync(async (req, res, next) => {
  const { chatId } = req.query;
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
});

const deleteMessage = catchAsync(async (req, res, next) => {
  const { messageId } = req.params;

  const message = await Message.findById(messageId);
  if (!message) return next(new AppError("Message not found", 404));

  if (message.sender.toString() !== req.user.id) {
    return next(new AppError("You can only delete your own messages", 403));
  }

  await message.deleteOne();

  // Emit event to inform clients
  req.io.to(message.chat.toString()).emit("message_deleted", {
    messageId: message._id,
    chatId: message.chat,
  });

  AppResponse(res, 200, null, "Message deleted successfully");
});

const markMessagesAsRead = catchAsync(async (req, res, next) => {
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
});

module.exports = {
  sendMessage,
  getMessagesByChatId,
  markMessagesAsRead,
  deleteMessage,
};
