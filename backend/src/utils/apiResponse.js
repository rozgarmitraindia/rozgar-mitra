export function sendSuccess(res, { statusCode = 200, message = "Success", data = null } = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

export function sendError(res, { statusCode = 500, message = "Something went wrong", code = "SERVER_ERROR", details = null } = {}) {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    ...(details ? { details } : {}),
  });
}

export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}
