import { NextFunction, Response } from "express";
import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import AppError from "../utils/AppError";
import "../config"; // Ensure environment variables are loaded
import { AuthenticatedRequest } from "../types";

const JWT_SECRET = process.env.JWT_SECRET;

export const validateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token =
      req.cookies?.token ||
      (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

    if (!token) {
      return next(new AppError("Authorization token is missing", 401));
    }

    if (!JWT_SECRET) {
      return next(new AppError("JWT secret is not configured", 500));
    }

    jwt.verify(
      token,
      JWT_SECRET,
      (err: VerifyErrors | null, decoded: JwtPayload | string | undefined) => {
        if (err) {
          const message =
            err.name === "TokenExpiredError"
              ? "Token has expired"
              : "Token is not valid";
          return next(new AppError(message, 401));
        }

        // Ensure decoded is an object
        if (typeof decoded !== "object" || !decoded) {
          return next(new AppError("Invalid token payload", 401));
        }
        req.user = decoded;
        console.log(req.user)
        next();
      }
    );
  } catch (error) {
    next(new AppError("Authentication failed", 401));
  }
};

export default validateToken;
