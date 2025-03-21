import AppResponse from "../utils/AppResponse";
import "../config";
import { Request, Response, NextFunction } from "express";

const NODE_ENV = process.env.NODE_ENV;
const devError = (err: any, res: Response) => {
  AppResponse(res, err.statusCode, {
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

// Error Handler for Production Environment
const prodError = (err: any, res: Response) => {
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
const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (NODE_ENV === "development") {
    devError(err, res);
  } else {
    prodError(err, res);
  }
};

export default globalErrorHandler;
