import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: any; // This will hold the user data from the token
}
