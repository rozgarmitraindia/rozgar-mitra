import { apiFetch } from "../../utils/auth.js";

export async function fetchEmployerSummary() {
  const result = await apiFetch("/employer/summary");
  return result.data || {};
}

export async function fetchEmployerJobs() {
  const result = await apiFetch("/employer/jobs");
  return result.data?.items || [];
}

export async function updateEmployerJobApplicationWindow(jobId, payload) {
  return apiFetch(`/employer/jobs/${jobId}/application-window`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchEmployerApplications() {
  const result = await apiFetch("/employer/applications");
  return result.data?.items || [];
}

export async function interviewApplicant(applicationId, payload = {}) {
  return apiFetch(`/employer/applications/${applicationId}/interview`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchSharedCandidates() {
  const result = await apiFetch("/employer/shared-candidates");
  return result.data?.items || [];
}

export async function shortlistApplicant(applicationId) {
  return apiFetch(`/employer/applications/${applicationId}/shortlist`, { method: "POST" });
}

export async function hireApplicant(applicationId, payload = {}) {
  return apiFetch(`/employer/applications/${applicationId}/hire`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fireApplicant(applicationId, payload = {}) {
  return apiFetch(`/employer/applications/${applicationId}/fire`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function rejectApplicant(applicationId, payload = {}) {
  return apiFetch(`/employer/applications/${applicationId}/reject`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
