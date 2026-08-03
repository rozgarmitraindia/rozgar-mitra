import { User } from "../models/User.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { sendError } from "../utils/apiResponse.js";
import { getBlockedStatusResponse } from "../utils/authStatus.js";

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return sendError(res, { statusCode: 401, code: "AUTH_REQUIRED", message: "Authentication required" });
    }

    const payload = verifyAccessToken(token);
    if (payload.type && payload.type !== "access") {
      return sendError(res, { statusCode: 401, code: "INVALID_TOKEN_TYPE", message: "Invalid access token" });
    }

    const user = await User.findById(payload.id);
    if (!user) {
      return sendError(res, { statusCode: 401, code: "INVALID_TOKEN", message: "Invalid token" });
    }

    req.user = user;
    next();
  } catch {
    return sendError(res, { statusCode: 401, code: "INVALID_TOKEN", message: "Invalid or expired token" });
  }
}

export async function optionalAuthenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return next();
    const payload = verifyAccessToken(token);
    if (payload.type && payload.type !== "access") return next();
    const user = await User.findById(payload.id);
    if (!user) return next();
    req.user = user;
    return next();
  } catch (e) {
    return next();
  }
}

export function checkStatus(req, res, next) {
  const blocked = getBlockedStatusResponse(req.user);
  if (blocked) return sendError(res, blocked);
  next();
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, { statusCode: 401, code: "AUTH_REQUIRED", message: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return sendError(res, { statusCode: 403, code: "FORBIDDEN", message: "Forbidden" });
    }
    next();
  };
}

export const requireAuth = [authenticate, checkStatus];
export const requireRole = authorize;
export const optionalAuth = optionalAuthenticate;
