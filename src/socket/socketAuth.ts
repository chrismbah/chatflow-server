import jwt, { JwtPayload, VerifyErrors } from "jsonwebtoken";
import AppError from "../utils/AppError";
import { Socket } from "socket.io";
import { NextFunction } from "express";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT secret is not configured");
}

const JWT_SECRET = process.env.JWT_SECRET;

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload | string; // Ensures socket.user exists
}
interface DecodedUser extends JwtPayload {
  _id: string;
}

const socketAuthMiddleware = (
  socket: AuthenticatedSocket,
  next: NextFunction
) => {
  const token =
    socket.handshake.auth.token ||
    socket.handshake.headers.cookie?.split("token=")[1];

  console.log("Token:", token);

  if (!token) {
    return next(new Error("Authorization token is missing"));
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

      // Ensure decoded is an object, not a string
      if (typeof decoded === "string" || !decoded) {
        return next(new AppError("Invalid token payload", 401));
      }

      socket.user = decoded as DecodedUser;
      next();
    }
  );
};

export default socketAuthMiddleware;
