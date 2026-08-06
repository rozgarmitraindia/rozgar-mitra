import { apiFetch, apiUpload, isNetworkError } from "../../utils/auth.js";

export async function fetchJobs(search = "") {
  try {
    const path = search ? `/jobs?search=${encodeURIComponent(search)}` : "/jobs";
    const result = await apiFetch(path);
    return result.data?.items || result.items || [];
  } catch (error) {
    if (isNetworkError(error)) return [];
    throw error;
  }
}

export async function fetchRooms(search = "") {
  try {
    const path = search ? `/rooms?search=${encodeURIComponent(search)}` : "/rooms";
    const result = await apiFetch(path);
    return result.data?.items || result.items || [];
  } catch (error) {
    if (isNetworkError(error)) return [];
    throw error;
  }
}

export async function fetchSavedJobs() {
  const result = await apiFetch("/user/saved");
  return result.data?.savedJobs || [];
}

export async function fetchCandidateSummary() {
  const result = await apiFetch("/user/summary");
  return result.data || {};
}

export async function fetchCurrentUser() {
  const result = await apiFetch("/user/me");
  return result.data?.user || null;
}

export async function fetchCandidateApplications() {
  const result = await apiFetch("/user/applications");
  return result.data?.items || [];
}

export async function fetchNotifications() {
  const result = await apiFetch("/notifications");
  return result.data?.items || [];
}

export async function fetchJobDetail(jobId) {
  const result = await apiFetch(`/jobs/${jobId}`);
  return result.data;
}

export async function fetchRoomDetail(roomId) {
  const result = await apiFetch(`/rooms/${roomId}`);
  return result.data;
}

export async function toggleJobSaved(jobId) {
  return apiFetch(`/jobs/${jobId}/wishlist`, { method: "POST" });
}

export async function toggleRoomSaved(roomId) {
  return apiFetch(`/rooms/${roomId}/wishlist`, { method: "POST" });
}

export async function requestRoomVisit(roomId, payload = {}) {
  return apiFetch(`/rooms/${roomId}/visit-requests`, { method: "POST", body: JSON.stringify(payload) });
}

export async function removeSavedJob(jobId) {
  return apiFetch(`/user/saved/jobs/${jobId}`, { method: "POST" });
}

export async function applyJob(jobId, payload = {}) {
  return apiFetch(`/jobs/${jobId}/applications`, { method: "POST", body: JSON.stringify(payload) });
}

export async function uploadGovernmentId(file) {
  const form = new FormData();
  form.append("file", file);
  form.append("type", "government-id");
  const result = await apiUpload("/upload/documents", form);
  return result.data?.document;
}

export async function uploadResume(file) {
  const form = new FormData();
  form.append("file", file);
  const result = await apiUpload("/upload/resume", form);
  return result.data?.document;
}
