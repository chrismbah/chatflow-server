import { Request, Response, NextFunction } from "express";

/**
 * Higher-order function to wrap async route handlers and pass errors to Express error middleware.
 * @param fn - Async request handler function.
 * @returns Wrapped function that catches and passes errors to `next()`.
 */
const catchAsync = <T extends Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: T, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
};

export default catchAsync;
