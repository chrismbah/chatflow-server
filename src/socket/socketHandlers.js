const Message = require("../models/Message");
const Chat = require("../models/Chat");
const User = require("../models/User");

const setupSocketHandlers = (io) => {
  io.on("connection", (socket) => {
    console.log("New socket connection:", socket.user.id);

    // Join user's personal room
    socket.join(socket.user.id);

    // Join all chat rooms the user is part of
    socket.on("join_chats", async () => {
      try {
        const chats = await Chat.find({
          users: { $elemMatch: { $eq: socket.user.id } },
        });

        chats.forEach((chat) => {
          socket.join(chat._id.toString());
        });
      } catch (error) {
        console.error("Error joining chats:", error);
      }
    });
    socket.on("send_message", async (messageData) => {
      try {
        const { chatId, content } = messageData;
        const chat = await Chat.findById(chatId);
        if (!chat) return socket.emit("message_error", "Chat not found");

        if (!chat.users.includes(socket.user.id)) {
          return socket.emit("message_error", "Unauthorized to send message");
        }

        const newMessage = await Message.create({
          sender: socket.user.id,
          content,
          chat: chatId,
        });

        await newMessage.populate("sender", "fullName avatar");
        await Chat.findByIdAndUpdate(chatId, { latestMessage: newMessage._id });

        io.to(chatId).emit("receive_message", newMessage);

        // Notify other users in the chat (excluding sender)
        chat.users.forEach((userId) => {
          if (userId.toString() !== socket.user.id) {
            io.to(userId.toString()).emit("new_notification", {
              chatId,
              message: newMessage,
            });
          }
        });
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("message_error", {
          message: "An error occurred",
          details: error.message,
        });
      }
    });

    // Typing indicator
    socket.on("typing", (chatId) => {
      socket.to(chatId).emit("typing", {
        chatId,
        userId: socket.user.id,
      });
    });

    // Stop Typing
    socket.on("stop_typing", (chatId) => {
      socket.to(chatId).emit("stop_typing", {
        chatId,
        userId: socket.user.id,
      });
    });

    // Read Message
    socket.on("read_message", async ({ messageId, chatId }) => {
      const message = await Message.findByIdAndUpdate(
        messageId,
        { read: true },
        { new: true }
      );

      if (message) {
        io.to(chatId).emit("message_read", { messageId, chatId });
      }
    });

    // Delete Message
    socket.on("delete_message", async ({ messageId, chatId }) => {
      await Message.findByIdAndDelete(messageId);
      io.to(chatId).emit("message_deleted", { messageId, chatId });
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.user?.id);
      if (socket.user?.id) {
        io.emit("user_offline", socket.user.id);
      }
    });
  });
};

module.exports = setupSocketHandlers;
