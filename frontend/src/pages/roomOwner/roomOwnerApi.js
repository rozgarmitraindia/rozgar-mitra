import { apiFetch } from "../../utils/auth.js";

export async function fetchRoomOwnerSummary() {
  const result = await apiFetch("/employer/summary");
  return result.data || {};
}

export async function fetchRoomOwnerRooms() {
  const result = await apiFetch("/employer/rooms");
  return result.data?.items || [];
}

export async function fetchRoomOwnerVisitRequests() {
  const result = await apiFetch("/employer/visit-requests");
  return result.data?.items || [];
}

export async function fetchRoomOwnerBookings() {
  const result = await apiFetch("/employer/bookings");
  return result.data?.items || [];
}

export async function respondToVisitRequest(requestId, payload = {}) {
  return apiFetch(`/employer/visit-requests/${requestId}/respond`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
