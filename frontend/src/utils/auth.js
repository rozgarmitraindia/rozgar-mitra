export function getSession() {
  try {
    const stored = localStorage.getItem("rozgar_session") || sessionStorage.getItem("rozgar_session");
    return JSON.parse(stored || "null");
  } catch {
    return null;
  }
}

export function setSession(session, persistent = true) {
  const payload = JSON.stringify(session);
  if (persistent) {
    localStorage.setItem("rozgar_session", payload);
    sessionStorage.removeItem("rozgar_session");
  } else {
    sessionStorage.setItem("rozgar_session", payload);
    localStorage.removeItem("rozgar_session");
  }
}

export function clearSession() {
  localStorage.removeItem("rozgar_session");
  sessionStorage.removeItem("rozgar_session");
}

const rawApiBase = import.meta.env.VITE_API_BASE_URL || "/api";
export const API_BASE = rawApiBase.replace(/\/+$/, "");

export function isLoggedIn() {
  return Boolean(getSession()?.token);
}

export function logout() {
  clearSession();
}

async function refreshAccessToken() {
  const session = getSession();
  if (!session?.refreshToken) return null;

  const response = await fetch(`${API_BASE}/auth/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    clearSession();
    throw new Error(data.message || "Unable to refresh session");
  }

  setSession({ ...session, token: data.accessToken || data.token, refreshToken: data.refreshToken, user: data.user }, localStorage.getItem("rozgar_session") !== null);
  return data;
}

export async function apiFetch(path, options = {}) {
  const session = getSession();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;

  let response = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });
  let data = await response.json().catch(() => ({}));

  if (response.status === 401 && session?.refreshToken && path !== "/auth/refresh-token") {
    const refreshData = await refreshAccessToken();
    if (refreshData?.accessToken || refreshData?.token) {
      const retrySession = getSession();
      const retryHeaders = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      };
      if (retrySession?.token) retryHeaders.Authorization = `Bearer ${retrySession.token}`;
      response = await fetch(`${API_BASE}${path}`, {
        headers: retryHeaders,
        ...options,
      });
      data = await response.json().catch(() => ({}));
    }
  }

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

export async function apiUpload(path, formData, options = {}) {
  const session = getSession();
  const headers = {
    ...(options.headers || {}),
  };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;

  let response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "POST",
    headers,
    body: formData,
    ...options,
  });
  let data = await response.json().catch(() => ({}));

  if (response.status === 401 && session?.refreshToken && path !== "/auth/refresh-token") {
    const refreshData = await refreshAccessToken();
    if (refreshData?.accessToken || refreshData?.token) {
      const retrySession = getSession();
      const retryHeaders = {
        ...(options.headers || {}),
      };
      if (retrySession?.token) retryHeaders.Authorization = `Bearer ${retrySession.token}`;
      response = await fetch(`${API_BASE}${path}`, {
        method: options.method || "POST",
        headers: retryHeaders,
        body: formData,
        ...options,
      });
      data = await response.json().catch(() => ({}));
    }
  }

  if (!response.ok) {
    throw new Error(data.message || "Upload failed");
  }
  return data;
}

export function isLoggedInAs(role) {
  const session = getSession();
  return Boolean(session?.role === role);
}

export function makeReadableId(prefix, name) {
  const clean = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 14);
  const seed = clean || "new";
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) % 999999;
  return `rozgarmitra-${prefix}-${seed}-${String(hash).padStart(6, "0")}`;
}
