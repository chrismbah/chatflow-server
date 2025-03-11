const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
require("../config");

const socketAuthMiddleware = (socket, next) => {
  const token =
    socket.handshake.auth.token ||
    socket.handshake.headers.cookie?.split("token=")[1];
  console.log("Token: " + token);

  if (!token) {
    return next(new Error("Authorization token is missing"));
  }

  if (!process.env.JWT_SECRET) {
    return next(new Error("JWT secret is not configured"));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      const message =
        err.name === "TokenExpiredError"
          ? "Token has expired"
          : "Token is not valid";
      return next(new AppError(message));
    }
    socket.user = decoded;
    next();
  });
};

module.exports = socketAuthMiddleware;
