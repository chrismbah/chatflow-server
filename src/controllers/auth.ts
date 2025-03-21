import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import User from "../models/User";
import { generateToken, setTokenCookie } from "../utils/token";
import AppError from "../utils/AppError";
import AppResponse from "../utils/AppResponse";

// Register a new user
const registerUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { fullName, email, password, avatar } = req.body;

    if (!fullName || !email || !password) {
      return next(new AppError("Please enter all fields", 400));
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return next(new AppError("User already exists", 400));
    }

    const user = await User.create({
      fullName,
      email,
      password,
      avatar,
    });

    if (!user) {
      return next(new AppError("Failed to create user", 500));
    }

    // Remove password from response object
    const userResponse = user.toObject();
    delete userResponse.password;

    return AppResponse(res, 201, userResponse, "Registration successful");
  }
);

// Login user
const loginUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return next(new AppError("Invalid email or password", 404));
    }

    if (user.provider === "google") {
      return next(
        new AppError("Please log in using Google, not with email/password", 400)
      );
    }

    if (user.matchPassword && (await user.matchPassword(password))) {
      const token = generateToken(user._id.toString());
      setTokenCookie(res, token);

      // Remove password from response object
      const userResponse = user.toObject();
      delete userResponse.password;

      return AppResponse(res, 200, userResponse, "Login successful");
    }

    return next(new AppError("Invalid email or password", 400));
  }
);

export { registerUser, loginUser };
