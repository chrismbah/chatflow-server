import { Request, Response, NextFunction } from "express";
import AppError from "../utils/AppError";

const invalidRoute = (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
};

export default invalidRoute;
