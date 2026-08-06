import { apiFetch } from "./auth.js";
import { subscribeNotifications as subscribeSocketNotifications } from "./socket.js";

const NOTIFICATION_COUNT_EVENT = "rozgar:notifications:count";

export function emitNotificationCountChange(unreadCount = null) {
  window.dispatchEvent(new CustomEvent(NOTIFICATION_COUNT_EVENT, { detail: { unreadCount } }));
}

export function onNotificationCountChange(callback) {
  function handler(event) {
    callback(event.detail?.unreadCount);
  }
  window.addEventListener(NOTIFICATION_COUNT_EVENT, handler);
  return () => window.removeEventListener(NOTIFICATION_COUNT_EVENT, handler);
}

export async function fetchNotifications() {
  const result = await apiFetch("/notifications");
  return result.data?.items || result.items || [];
}

export async function fetchUnreadCount() {
  try {
    const result = await apiFetch("/notifications/unread-count");
    return result.data?.unreadCount || 0;
  } catch {
    return 0;
  }
}

export async function markNotificationRead(notificationId) {
  const result = await apiFetch(`/notifications/${notificationId}/read`, { method: "PATCH" });
  emitNotificationCountChange();
  return result;
}

export async function markAllNotificationsRead() {
  const result = await apiFetch("/notifications/read-all", { method: "PATCH" });
  emitNotificationCountChange(0);
  return result;
}

export function subscribeNotifications(callback) {
  return subscribeSocketNotifications(callback);
}
