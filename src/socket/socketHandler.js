const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("Connected to socket.io");

    socket.on("setup", (userData) => {
      if (!userData || !userData._id) return;
      socket.join(userData._id);
      socket.emit("connected");
      console.log("User is connected");
    });

    socket.on("join_chat", (room) => {
      socket.join(room);
      console.log("User Joined Room: " + room);
    });

    socket.on("typing", ({ chatId, userId }) => {
      socket.in(chatId).emit("typing", { chatId, userId });
      console.log(`User ${userId} is typing in chat ${chatId}`);
    });

    socket.on("stop_typing", ({ chatId, userId }) => {
      socket.in(chatId).emit("stop_typing", { chatId, userId });
      console.log(`User ${userId} stopped typing in chat ${chatId}`);
    });

    socket.on("new_message", (newMessageReceived) => {
      const chat = newMessageReceived.chat;
      socket.in(chat).emit("message_received", newMessageReceived);
      console.log("New message emitted to room:", chat);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });
};

module.exports = socketHandler;
