import { io } from "socket.io-client";
import { getSession } from "./auth.js";

let socket = null;

export function getSocket() {
  if (socket) return socket;
  const session = getSession();
  const token = session?.token;
  socket = io(import.meta.env.VITE_BACKEND_WS_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:5000", {
    path: "/socket.io",
    auth: { token },
    transports: ["websocket"],
    autoConnect: false,
  });
  return socket;
}

export function subscribeNotifications(onNotification) {
  const sock = getSocket();
  if (!sock) return () => {};
  sock.on("notification", onNotification);
  if (!sock.connected) sock.connect();
  return () => {
    sock.off("notification", onNotification);
  };
}
