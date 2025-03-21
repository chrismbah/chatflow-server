import { Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import User, { IUser } from "../models/User";
import AppResponse from "../utils/AppResponse";
import AppError from "../utils/AppError";
import { findDirectChat } from "../helpers/chat";
import { AuthenticatedRequest } from "../types";

interface GetAllUsersQuery {
  page?: string;
  limit?: string;
  search?: string;
}

const getUserProfile = catchAsync(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user.id; // Retrieve user ID from the token data in req.user
    if (!userId) {
      return next(new AppError("User ID not found", 400));
    }
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    return AppResponse(res, 200, user);
  }
);

const getAllUsers = catchAsync(
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { page = "1", limit = "10", search }: GetAllUsersQuery = req.query;

    // Convert query parameters to numbers
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Get the search query if it exists
    const userSearch = search
      ? {
          $or: [
            { fullName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    // Fetch all users matching the search query, excluding the logged-in user
    const allUsers: IUser[] = await User.find({
      ...userSearch,
      _id: { $ne: req.user.id },
    }).select("-password");

    // Filter out users that already have a chat with the logged-in user
    const availableUsers = await Promise.all(
      allUsers.map(async (user) => {
        const chat = await findDirectChat(user._id.toString(), req.user.id);
        return chat.length === 0 ? user : null;
      })
    );

    // Remove null values (users that have an existing chat)
    const filteredUsers = availableUsers.filter(
      (user): user is IUser => user !== null
    );

    // Apply pagination to the filtered users
    const paginatedUsers = filteredUsers.slice(skip, skip + limitNum);

    // Prepare pagination metadata
    const totalUsers = filteredUsers.length; // Total users after filtering
    const totalPages = Math.ceil(totalUsers / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    return AppResponse(res, 200, {
      users: paginatedUsers,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalUsers,
        limit: limitNum,
        hasNextPage,
        hasPrevPage,
      },
    });
  }
);

export { getAllUsers, getUserProfile };
