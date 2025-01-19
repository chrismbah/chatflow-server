const AppResponse = (res, statusCode, data, message) => {
  return res.status(statusCode).json({
    statusCode,
    success: statusCode >= 200 && statusCode < 300,
    message:
      message ||
      (statusCode >= 200 && statusCode < 300
        ? "Request successful"
        : "Request failed"),
    data,
  });
};

module.exports= AppResponse