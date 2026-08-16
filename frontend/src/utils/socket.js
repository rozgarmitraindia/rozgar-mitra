import { io } from "socket.io-client";
import { getSession } from "./auth.js";

let socket = null;
let authListenerAttached = false;

function resolveSocketUrl() {
  if (import.meta.env.VITE_BACKEND_WS_URL) return import.meta.env.VITE_BACKEND_WS_URL;
  const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
  if (apiBase.startsWith("http://") || apiBase.startsWith("https://")) {
    try {
      const url = new URL(apiBase);
      return `${url.protocol}//${url.host}`;
    } catch {
      return "https://rozgar-mitra-india.onrender.com";
    }
  }
  return window.location.origin;
}

export function getSocket() {
  const session = getSession();
  const token = session?.token;
  if (socket) {
    socket.auth = { token };
    return socket;
  }
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
  if (!authListenerAttached && typeof window !== "undefined") {
    authListenerAttached = true;
    window.addEventListener("rozgar:auth-change", () => {
      if (!socket) return;
      const nextToken = getSession()?.token;
      socket.auth = { token: nextToken };
      if (socket.connected) {
        socket.disconnect();
        if (nextToken) socket.connect();
      }
    });
  }
  return socket;
}

export function subscribeNotifications(onNotification) {
  if (typeof window !== "undefined" && window.__ROZGAR_BACKEND_OFFLINE__) return () => {};
  const sock = getSocket();
  if (!sock) return () => {};
  sock.auth = { token: getSession()?.token };
  sock.on("notification", onNotification);
  if (!sock.connected) sock.connect();
  return () => {
    sock.off("notification", onNotification);
  };
}
