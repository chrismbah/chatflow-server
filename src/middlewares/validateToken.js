const AppError = require("../utils/AppError");
const jwt = require("jsonwebtoken");
require("../config");

const JWT_SECRET = process.env.JWT_SECRET;
const validateToken = (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];
  if (!token) next(new AppError("Authorization token is missing", 401));
  if (!JWT_SECRET) {
    return next(new AppError("JWT secret not found", 404));
  }
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      const message =
        err.name === "TokenExpiredError"
          ? "Token has expired"
          : "Token is not valid";
      return next(new AppError(message, 401));
    }
    req.user = decoded;
    next();
  });
};

module.exports = validateToken;
