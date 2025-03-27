import { Server, Socket } from "socket.io";
import Message, { IMessage } from "../models/Message";
import User from "../models/User";
import Chat from "../models/Chat";
// Map to track active users in memory, mapping user IDs to their current socket ID
const activeUsers: Map<string, string> = new Map();

// Nested map to track unread message counts for each user across different chats
// Allows quick lookup of how many unread messages a user has in a specific chat
const unreadMessagesCount: Map<string, Map<string, number>> = new Map();
// { userId: ruruiru, {chatId:jeie83, 9}}

// Nested map to store the latest unread message for each user in each chat
// Helps in showing the most recent unread message preview
const latestUnreadMessages: Map<string, Map<string, IMessage>> = new Map();

// Interface defining the structure of typing events (who is typing in which chat)
interface TypingEvent {
  chatId: string;
  userId: string;
}

// Interface defining the structure of read message events
interface ReadMessagesEvent {
  chatId: string;
  userId: string;
}

const socketHandler = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log("Connected to socket.io");

    // Initial setup when a user connects - handles user initialization, status, and data
    socket.on("setup", (userData: { _id: string }) => {
      if (!userData || !userData._id) return;

      // Store the user's socket ID for real-time communication
      activeUsers.set(userData._id, socket.id);

      // Create a personal room for the user to enable direct messaging
      socket.join(userData._id);

      // Notify the user they are successfully connected
      socket.emit("connected");

      // Inform other connected clients that this user is now online
      socket.broadcast.emit("user_online", { userId: userData._id });

      // Send unread message counts to the user upon connection
      // If no unread messages, send an empty object to initialize the state
      if (unreadMessagesCount.has(userData._id)) {
        const userUnreadCounts = Object.fromEntries(
          unreadMessagesCount.get(userData._id)!
        );
        socket.emit("unread_messages_count", userUnreadCounts);
      } else {
        socket.emit("unread_messages_count", {});
      }

      // Send latest unread messages to the user
      // If no unread messages, send an empty object
      if (latestUnreadMessages.has(userData._id)) {
        const userLatestMessages = Object.fromEntries(
          latestUnreadMessages.get(userData._id)!
        );
        socket.emit("latest_unread_messages", userLatestMessages);
      } else {
        socket.emit("latest_unread_messages", {});
      }

      // Update user's online status in the database
      User.findByIdAndUpdate(userData._id, {
        isOnline: true,
        lastActive: new Date(),
      })
        .then(() => console.log(`User ${userData._id} is online`))
        .catch((err) => console.error("Error updating user status:", err));

      console.log("User is connected:", userData._id);
    });

    // Handler to check and respond with a specific user's online status
    socket.on("get_user_status", (requestedUserId: string) => {
      // Check if the requested user is currently active
      const isUserOnline = activeUsers.has(requestedUserId);

      // Send back the user's status only to the requesting socket
      socket.emit("user_status_response", {
        userId: requestedUserId,
        isOnline: isUserOnline,
      });
      console.log(`User: ${requestedUserId} is online`);
    });

    // Allow a user to join a specific chat room
    socket.on("join_chat", (chatId: string) => {
      socket.join(chatId);
      console.log("User just joined chat: " + chatId);
    });

    // Handle typing indicators - broadcast to other users in the chat
    socket.on("typing", ({ chatId, userId }: TypingEvent) => {
      // Emit typing event to all users in this chat, except the sender
      socket.in(chatId).emit("typing", { chatId, userId });
      console.log(`User ${userId} is typing in chat ${chatId}`);
    });

    // Handle stopping typing indicators
    socket.on("stop_typing", ({ chatId, userId }: TypingEvent) => {
      // Emit stop typing event to all users in this chat, except the sender
      socket.in(chatId).emit("stop_typing", { chatId, userId });
      console.log(`User ${userId} stopped typing in chat ${chatId}`);
    });

    // Complex handler for new messages - manages notifications and unread message tracking
    socket.on("new_message", async (newMessageReceived: IMessage) => {
      const chat = newMessageReceived.chat.toString();
      const sender = newMessageReceived.sender.toString();

      try {
        // Fetch all users in this chat to manage notifications
        const chatUsers = await getChatUsers(chat);

        chatUsers.forEach((user) => {
          // Skip sending notifications to the message sender
          if (user === sender) return;

          // Initialize unread tracking for this user if not exists
          if (!unreadMessagesCount.has(user)) {
            unreadMessagesCount.set(user, new Map());
          }
          if (!latestUnreadMessages.has(user)) {
            latestUnreadMessages.set(user, new Map());
          }

          // Increment unread message count for this chat and user
          const userCounts = unreadMessagesCount.get(user)!;
          const currentCount = userCounts.get(chat) ?? 0;
          userCounts.set(chat, currentCount + 1);

          // Store the latest unread message
          latestUnreadMessages.get(user)!.set(chat, newMessageReceived);

          // Send real-time unread notifications to online users
          if (activeUsers.has(user)) {
            const socketId = activeUsers.get(user)!;

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

      // Broadcast the message to all users in the chat room
      socket.in(chat).emit("message_received", newMessageReceived);
      console.log("New message emitted to room:", chat);
    });

    // Handler for marking messages as read
    socket.on(
      "read_messages",
      async ({ chatId, userId }: ReadMessagesEvent) => {
        try {
          // Update all unread messages in this chat to mark them as read by this user
          await Message.updateMany(
            { chat: chatId, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
          );

          // Clear unread counts for this user and chat
          if (unreadMessagesCount.has(userId)) {
            unreadMessagesCount.get(userId)!.delete(chatId);

            // Emit updated unread counts to the user, reducing to 0 indicating userhas read all messages in chat
            if (activeUsers.has(userId)) {
              const socketId = activeUsers.get(userId)!;
              io.to(socketId).emit("unread_messages_count", { [chatId]: 0 });
            }
          }

          // Remove the latest unread message for this chat
          if (latestUnreadMessages.has(userId)) {
            latestUnreadMessages.get(userId)!.delete(chatId);
          }

          // Notify other users in the chat that messages have been read
          socket.in(chatId).emit("messages_read", { chatId, userId });
          console.log(
            `User ${userId} just read all messages in chat ${chatId}`
          );
        } catch (error) {
          console.error("Error marking messages as read:", error);
        }
      }
    );

    // Handle user disconnection
    socket.on("disconnect", () => {
      // Find the user associated with this disconnected socket
      const userId = [...activeUsers.entries()].find(
        ([key, value]) => value === socket.id
      )?.[0];

      if (userId) {
        // Remove the user from active users
        activeUsers.delete(userId);

        // Broadcast offline status to other users
        socket.broadcast.emit("user_offline", { userId });

        // Update user's offline status in the database
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

// Helper function to retrieve all users in a specific chat
async function getChatUsers(chatId: string): Promise<string[]> {
  try {
    // Fetch chat and extract user IDs
    const chat = await Chat.findById(chatId).select("users");

    if (!chat || !chat.users) return [];

    // Convert ObjectIds to strings for easier handling
    return chat.users.map((userId) => userId.toString());
  } catch (error) {
    console.error("Error fetching chat users:", error);
    return [];
  }
}

export default socketHandler;
