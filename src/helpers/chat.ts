import Chat from "../models/Chat";
import { Types } from "mongoose";

/**
 * Finds a direct (one-on-one) chat between two users.
 * @param userId - The ID of the other user.
 * @param currentUserId - The ID of the current user.
 * @returns A promise resolving to the found chat(s) or an empty array if none exist.
 */
const findDirectChat = async (
  userId: Types.ObjectId | string,
  currentUserId: Types.ObjectId | string
) => {
  return await Chat.find({
    isGroupChat: false,
    $and: [
      { users: { $elemMatch: { $eq: currentUserId } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");
};

export { findDirectChat };
