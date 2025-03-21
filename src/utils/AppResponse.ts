import { Response } from "express";

interface AppResponseData {
  statusCode: number;
  success: boolean;
  message: string;
  data?: any;
}

const AppResponse = (
  res: Response,
  statusCode: number,
  data?: any,
  message?: string
) => {
  const response: AppResponseData = {
    statusCode,
    success: statusCode >= 200 && statusCode < 300,
    message:
      message ??
      (statusCode >= 200 && statusCode < 300
        ? "Request successful"
        : "Request failed"),
    data,
  };

  return res.status(statusCode).json(response);
};

export default AppResponse;
