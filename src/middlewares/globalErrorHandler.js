const AppResponse = require("../utils/AppResponse");
const { NODE_ENV } = require("../config");

const devError = (err, res) => {
  AppResponse(res, err.statusCode, {
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

// Error Handler for Production Environment
const prodError = (err, res) => {
  if (err.isOperational) {
    AppResponse(res, err.statusCode, {
      status: err.status,
      message: err.message,
    });
  } else {
    console.error("ERROR", err);
    AppResponse(res, 500, null, "Something went wrong!");
  }
};

// Global Error Handling Middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  if (NODE_ENV === "development") {
    devError(err, res);
  } else {
    prodError(err, res);
  }
};

module.exports = globalErrorHandler;
