import jwt from "jsonwebtoken";

const accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export function signAccessToken(user) {
  return jwt.sign({ id: user._id, role: user.role, status: user.status, type: "access" }, process.env.JWT_SECRET, { expiresIn: accessExpiresIn });
}

export function signRefreshToken(user) {
  return jwt.sign({ id: user._id, role: user.role, type: "refresh" }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: refreshExpiresIn });
}

export function signToken(user) {
  return signAccessToken(user);
}

export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
}

export function verifyToken(token) {
  return verifyAccessToken(token);
}
