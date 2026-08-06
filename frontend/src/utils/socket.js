import { io } from "socket.io-client";
import { getSession } from "./auth.js";

let socket = null;

function resolveSocketUrl() {
  if (import.meta.env.VITE_BACKEND_WS_URL) return import.meta.env.VITE_BACKEND_WS_URL;
  const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
  if (apiBase.startsWith("http://") || apiBase.startsWith("https://")) {
    try {
      const url = new URL(apiBase);
      return `${url.protocol}//${url.host}`;
    } catch {
      return "http://localhost:3000";
    }
  }
  return import.meta.env.DEV ? "http://localhost:3000" : window.location.origin;
}

export function getSocket() {
  if (socket) return socket;
  const session = getSession();
  const token = session?.token;
  socket = io(resolveSocketUrl(), {
    path: "/socket.io",
    auth: { token },
    transports: ["websocket", "polling"],
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
