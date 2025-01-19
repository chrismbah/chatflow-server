const AppError = require("../utils/AppError");
const invalidRoute = (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
};

module.exports = invalidRoute;
