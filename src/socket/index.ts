import { Server, Socket } from "socket.io";
import Message from "../models/Message";
import User from "../models/User";
import Chat from "../models/Chat";

// Store active users in memory
const activeUsers: Map<string, string> = new Map(); // Key: userId, Value: socketId

// Store unread messages count
const unreadMessagesCount: Map<string, Map<string, number>> = new Map(); // Key: userId, Value: Map<chatId, count>
const latestUnreadMessages: Map<string, Map<string, any>> = new Map(); // Key: userId, Value: Map<chatId, messageObject>

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

      // Send the user their unread message counts if available
      if (unreadMessagesCount.has(userData._id)) {
        const userUnreadCounts = Object.fromEntries(
          unreadMessagesCount.get(userData._id)!
        );
        socket.emit("unread_messages_count", userUnreadCounts);
      } else {
        // Send empty object to initialize state
        socket.emit("unread_messages_count", {});
      }

      // Send the user their latest unread messages if available
      if (latestUnreadMessages.has(userData._id)) {
        const userLatestMessages = Object.fromEntries(
          latestUnreadMessages.get(userData._id)!
        );
        socket.emit("latest_unread_messages", userLatestMessages);
      } else {
        // Send empty object to initialize state
        socket.emit("latest_unread_messages", {});
      }

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
      console.log(`User: ${requestedUserId} is online`);
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

    socket.on("new_message", async (newMessageReceived: MessageEvent) => {
      const { chat, sender, _id } = newMessageReceived;

      // Get all users in this chat to determine who should receive unread notifications
      try {
        const chatUsers = await getChatUsers(chat);

        chatUsers.forEach((userId) => {
          if (userId === sender) return;

          // Initialize maps if needed
          if (!unreadMessagesCount.has(userId)) {
            unreadMessagesCount.set(userId, new Map());
          }
          if (!latestUnreadMessages.has(userId)) {
            latestUnreadMessages.set(userId, new Map());
          }

          const userCounts = unreadMessagesCount.get(userId)!;
          userCounts.set(chat, (userCounts.get(chat) ?? 0) + 1);

          latestUnreadMessages.get(userId)!.set(chat, newMessageReceived);

          // Emit to online users with consistent event names
          if (activeUsers.has(userId)) {
            const socketId = activeUsers.get(userId)!;

            io.to(socketId).emit("unread_messages_count", {
              [chat]: userCounts.get(chat),
            });

            io.to(socketId).emit("latest_unread_messages", {
              [chat]: newMessageReceived,
            });
          }
        });
      } catch (error) {
        console.error("Error handling new message notifications:", error);
      }

      // Emit the message to the chat room (existing functionality)
      socket.in(chat).emit("message_received", newMessageReceived);
      console.log("New message emitted to room:", chat);
    });

    socket.on(
      "read_messages",
      async ({ chatId, userId }: ReadMessagesEvent) => {
        try {
          // Update messages in database
          await Message.updateMany(
            { chat: chatId, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
          );

          // Clear unread counts for this user and chat
          if (unreadMessagesCount.has(userId)) {
            unreadMessagesCount.get(userId)!.delete(chatId);

            // Emit updated unread counts (an empty object means no unread messages)
            if (activeUsers.has(userId)) {
              const socketId = activeUsers.get(userId)!;
              io.to(socketId).emit("unread_messages_count", { [chatId]: 0 });
            }
          }

          // Clear latest unread message for this chat
          if (latestUnreadMessages.has(userId)) {
            latestUnreadMessages.get(userId)!.delete(chatId);
          }

          // Notify other users
          socket.in(chatId).emit("messages_read", { chatId, userId });
          console.log(
            `User ${userId} just read all messages in chat ${chatId}`
          );
        } catch (error) {
          console.error("Error marking messages as read:", error);
        }
      }
    );

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

// Helper function to get users in a chat
async function getChatUsers(chatId: string): Promise<string[]> {
  try {
    const chat = await Chat.findById(chatId).select("users");

    if (!chat || !chat.users) return [];

    // Convert ObjectId[] to string[]
    return chat.users.map((userId) => userId.toString());
  } catch (error) {
    console.error("Error fetching chat users:", error);
    return [];
  }
}

export default socketHandler;
