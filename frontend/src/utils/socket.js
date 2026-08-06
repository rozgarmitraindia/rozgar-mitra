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
      return "http://127.0.0.1:3000";
    }
  }
  return window.location.origin;
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
    timeout: 8000,
    reconnectionAttempts: 2,
    reconnectionDelay: 4000,
  });
  socket.on("connect_error", () => {});
  return socket;
}

export function subscribeNotifications(onNotification) {
  if (typeof window !== "undefined" && window.__ROZGAR_BACKEND_OFFLINE__) return () => {};
  const sock = getSocket();
  if (!sock) return () => {};
  sock.on("notification", onNotification);
  if (!sock.connected) sock.connect();
  return () => {
    sock.off("notification", onNotification);
  };
}
