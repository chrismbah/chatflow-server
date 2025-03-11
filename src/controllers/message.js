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

module.exports = {
  sendMessage,
  getMessagesByChatId,
  // updateMessageReadStatus,
  deleteMessage,
};
