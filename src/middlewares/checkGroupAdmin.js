const AppError = require("../utils/AppError");
const Chat = require("../models/Chat");

const checkGroupAdmin = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    if (!groupId) next(new AppError("Group ID not found", 404));
    // Find the group chat
    const group = await Chat.findById(groupId);
    if (!group) next(new AppError("Group not found"));
    // Check if the user is one of the admins
    const isAdmin = group.groupAdmins.some(
      (adminId) => adminId.toString() === req.user.id
    );
    if (!isAdmin) next(new AppError("User is not an admin of this group", 403));
    // User is an admin; proceed
    next();
  } catch (error) {
    next(new AppError(error));
  }
};

module.exports = checkGroupAdmin;
