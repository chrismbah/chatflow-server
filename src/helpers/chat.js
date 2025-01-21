const Chat = require("../models/Chat");

const findDirectChat = async (userId, currentUserId) => {
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

module.exports = { findDirectChat };
