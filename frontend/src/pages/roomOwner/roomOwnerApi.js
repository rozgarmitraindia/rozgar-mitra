import { apiFetch, isNetworkError } from "../../utils/auth.js";

export async function fetchRoomOwnerSummary() {
  try {
    const result = await apiFetch("/employer/summary");
    return result.data || {};
  } catch (error) {
    if (isNetworkError(error)) return {};
    throw error;
  }
}

export async function fetchRoomOwnerRooms() {
  try {
    const result = await apiFetch("/employer/rooms");
    return result.data?.items || [];
  } catch (error) {
    if (isNetworkError(error)) return [];
    throw error;
  }
}

export async function closeRoomOwnerRoom(roomId, reason = "Closed by owner") {
  return apiFetch(`/employer/rooms/${roomId}/close`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

export async function duplicateRoomOwnerRoom(roomId) {
  return apiFetch(`/employer/rooms/${roomId}/duplicate`, { method: "POST" });
}

export async function deleteRoomOwnerRoom(roomId) {
  return apiFetch(`/employer/rooms/${roomId}`, { method: "DELETE" });
}

export async function fetchRoomOwnerVisitRequests() {
  try {
    const result = await apiFetch("/employer/visit-requests");
    return result.data?.items || [];
  } catch (error) {
    if (isNetworkError(error)) return [];
    throw error;
  }
}

export async function fetchRoomOwnerBookings() {
  try {
    const result = await apiFetch("/employer/bookings");
    return result.data?.items || [];
  } catch (error) {
    if (isNetworkError(error)) return [];
    throw error;
  }
}

export async function respondToVisitRequest(requestId, payload = {}) {
  return apiFetch(`/employer/visit-requests/${requestId}/respond`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function confirmRoomBooking(bookingId, payload = {}) {
  return apiFetch(`/employer/bookings/${bookingId}/confirm`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchRentManagement() {
  const result = await apiFetch("/employer/rent-management");
  return result.data?.items || [];
}

export async function recordRentPayment(bookingId, payload) {
  return apiFetch(`/employer/rent-management/${bookingId}/payments`, { method: "POST", body: JSON.stringify(payload) });
}

export async function sendRentReminder(bookingId, payload) {
  return apiFetch(`/employer/rent-management/${bookingId}/reminder`, { method: "POST", body: JSON.stringify(payload) });
}
