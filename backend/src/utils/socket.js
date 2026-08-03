import { Server as SocketIO } from "socket.io";
import { verifyAccessToken } from "./jwt.js";

let io = null;

export function initializeSocket(server, allowedOrigins = []) {
  if (io) return io;
  io = new SocketIO(server, {
    cors: {
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        const normalized = origin.replace(/\/?$/, "");
        if (allowedOrigins.includes(normalized)) return callback(null, true);
        callback(new Error(`CORS blocked by socket.io: ${origin}`));
      },
      credentials: true,
    },
  });

  io.on("connection", async (socket) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token) {
      try {
        const payload = verifyAccessToken(token);
        if (payload && payload.id) {
          socket.join(payload.id);
          if (payload.role) {
            socket.join(payload.role);
          }
        }
      } catch (error) {
        console.warn("Socket auth failed", error.message);
      }
    }

    socket.on("disconnect", () => {
      // cleanup handled by socket.io automatically
    });
  });

  return io;
}

export function emitNotificationToUser(userId, payload) {
  if (!io || !userId) return;
  io.to(String(userId)).emit("notification", payload);
}

export function emitNotificationToRole(role, payload) {
  if (!io || !role) return;
  io.to(role).emit("notification", payload);
}

export function emitGlobalNotification(payload) {
  if (!io) return;
  io.emit("notification", payload);
}
