import jwt, { Secret } from "jsonwebtoken";
import { Response } from "express";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT secret is not configured");
}

const JWT_SECRET: Secret = process.env.JWT_SECRET;

/**
 * Generates a JWT token for a given user ID.
 * @param id - The user's ID.
 * @returns A signed JWT token.
 */
const generateToken = (id: string): string => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: "1d", // 1 day
  });
};

/**
 * Sets a JWT token as an HTTP-only cookie in the response.
 * @param res - Express Response object.
 * @param token - The JWT token.
 */
const setTokenCookie = (res: Response, token: string): void => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Use HTTPS in production
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });
};

export { generateToken, setTokenCookie };
