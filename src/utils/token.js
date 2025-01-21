const jwt = require("jsonwebtoken");
require("../config");

const JWT_SECRET = process.env.JWT_SECRET;
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: 24 * 60 * 60 * 1000,
  });
};

const setTokenCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Use HTTPS in production
    sameSite: "strict",
    maxAge:  24 * 60 * 60 * 1000, // 1 day
  });
};

module.exports = { generateToken, setTokenCookie };
