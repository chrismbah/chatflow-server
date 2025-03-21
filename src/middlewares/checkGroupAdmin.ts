import mongoose from "mongoose";
import AppError from "../utils/AppError";
import Chat from "../models/Chat";
import {Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";

const checkGroupAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { groupId } = req.params;
    if (!groupId) return next(new AppError("Group ID not found", 404));

    // Find the group chat
    const group = await Chat.findById(groupId);
    if (!group) return next(new AppError("Group not found", 404));

    // Ensure user is authenticated
    if (!req.user || !req.user._id) {
      return next(new AppError("Unauthorized: No user found", 401));
    }

    // Ensure `groupAdmins` is an array before checking for admin status
    if (!Array.isArray(group.groupAdmins)) {
      return next(
        new AppError("Invalid group data: groupAdmins is missing", 500)
      );
    }

    // Check if the user is one of the admins
    const isAdmin = group.groupAdmins.some(
      (adminId: mongoose.Types.ObjectId) => adminId.toString() === req.user!._id
    );

    if (!isAdmin) {
      return next(new AppError("User is not an admin of this group", 403));
    }

    // User is an admin; proceed
    next();
  } catch (error: any) {
    next(new AppError(error.message, 500));
  }
};

export default checkGroupAdmin;
