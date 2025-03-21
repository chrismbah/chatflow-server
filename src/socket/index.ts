import { Server, Socket } from "socket.io";
import Message from "../models/Message";
import User from "../models/User";


// Store active users in memory
const activeUsers: Map<string, string> = new Map(); // Key: userId, Value: socketId

// Define types for expected event payloads
interface UserData {
  _id: string;
}

interface TypingEvent {
  chatId: string;
  userId: string;
}

interface MessageEvent {
  _id: string;
  sender: string;
  content: string;
  chat: string;
  createdAt: Date;
}

interface ReadMessagesEvent {
  chatId: string;
  userId: string;
}

const socketHandler = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log("Connected to socket.io");

    // When a user connects, add them to the active users list
    socket.on("setup", (userData: UserData) => {
      if (!userData || !userData._id) return;

      // Add user to activeUsers map
      activeUsers.set(userData._id, socket.id);

      // Join the user's personal room
      socket.join(userData._id);

      // Notify the user that they are connected
      socket.emit("connected");

      // Broadcast to others that this user is online
      socket.broadcast.emit("user_online", { userId: userData._id });

      // Update the user's status in the database
      User.findByIdAndUpdate(userData._id, {
        isOnline: true,
        lastActive: new Date(),
      })
        .then(() => console.log(`User ${userData._id} is online`))
        .catch((err) => console.error("Error updating user status:", err));

      console.log("User is connected:", userData._id);
    });

    socket.on("get_user_status", (requestedUserId: string) => {
      // Check if the requested user is in activeUsers map
      const isUserOnline = activeUsers.has(requestedUserId);

      // Send the status back only to the requesting socket
      socket.emit("user_status_response", {
        userId: requestedUserId,
        isOnline: isUserOnline,
      });
    });

    socket.on("join_chat", (chatId: string) => {
      socket.join(chatId);
      console.log("User just joined chat: " + chatId);
    });

    socket.on("typing", ({ chatId, userId }: TypingEvent) => {
      socket.in(chatId).emit("typing", { chatId, userId });
      console.log(`User ${userId} is typing in chat ${chatId}`);
    });

    socket.on("stop_typing", ({ chatId, userId }: TypingEvent) => {
      socket.in(chatId).emit("stop_typing", { chatId, userId });
      console.log(`User ${userId} stopped typing in chat ${chatId}`);
    });

    socket.on("new_message", (newMessageReceived: MessageEvent) => {
      const { chat } = newMessageReceived;
      socket.in(chat).emit("message_received", newMessageReceived);
      console.log("New message emitted to room:", chat);
    });

    socket.on("read_messages", async ({ chatId, userId }: ReadMessagesEvent) => {
      try {
        // Update messages in database
        await Message.updateMany(
          { chat: chatId, readBy: { $ne: userId } },
          { $addToSet: { readBy: userId } }
        );

        // Notify other users
        socket.in(chatId).emit("messages_read", { chatId, userId });
        console.log(`User ${userId} just read all messages in chat ${chatId}`);
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });

    socket.on("disconnect", () => {
      // Find the user who disconnected
      const userId = [...activeUsers.entries()].find(
        ([key, value]) => value === socket.id
      )?.[0];

      if (userId) {
        // Remove the user from the activeUsers map
        activeUsers.delete(userId);

        // Broadcast to others that this user is offline
        socket.broadcast.emit("user_offline", { userId });

        // Update the user's status in the database
        User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastActive: new Date(),
        })
          .then(() => console.log(`User ${userId} is offline`))
          .catch((err) => console.error("Error updating user status:", err));
      }

      console.log("User disconnected:", userId);
    });
  });
};

export default socketHandler;
