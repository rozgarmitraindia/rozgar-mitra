import { apiFetch } from "./auth.js";
import { subscribeNotifications as subscribeSocketNotifications } from "./socket.js";

export async function fetchNotifications() {
  const result = await apiFetch("/notifications");
  return result.data?.items || result.items || [];
}

export async function fetchUnreadCount() {
  const result = await apiFetch("/notifications/unread-count");
  return result.data?.unreadCount || 0;
}

export async function markNotificationRead(notificationId) {
  return apiFetch(`/notifications/${notificationId}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead() {
  return apiFetch("/notifications/read-all", { method: "PATCH" });
}

export function subscribeNotifications(callback) {
  return subscribeSocketNotifications(callback);
}
