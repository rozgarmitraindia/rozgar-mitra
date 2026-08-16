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
  window.dispatchEvent(new CustomEvent("rozgar:auth-change", { detail: { authenticated: true, role: session?.role } }));
}

export function clearSession() {
  localStorage.removeItem("rozgar_session");
  sessionStorage.removeItem("rozgar_session");
  window.dispatchEvent(new CustomEvent("rozgar:auth-change", { detail: { authenticated: false } }));
}

const rawApiBase = import.meta.env.VITE_API_BASE_URL || "/api";
export const API_BASE = rawApiBase.replace(/\/+$/, "");
export const NETWORK_ERROR_MESSAGE = "Service temporarily unavailable. Please try again in a moment.";

export class ApiNetworkError extends Error {
  constructor(message = NETWORK_ERROR_MESSAGE, cause = null) {
    super(message);
    this.name = "ApiNetworkError";
    this.code = "NETWORK_ERROR";
    if (cause) this.cause = cause;
  }
}

export function isNetworkError(error) {
  return error?.code === "NETWORK_ERROR" || error?.name === "ApiNetworkError";
}

function setBackendOffline(value) {
  if (typeof window !== "undefined") window.__ROZGAR_BACKEND_OFFLINE__ = Boolean(value);
}

export function isLoggedIn() {
  return Boolean(getSession()?.token);
}

export function logout() {
  clearSession();
}

let refreshPromise = null;

async function readResponseBody(response) {
  const text = await response.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function errorMessageFromResponse(response, data, fallback = "Request failed") {
  if (response.status === 429) return data.message || "Server busy hai. Please kuch seconds baad retry karein.";
  if (response.status >= 500) return data.message || "Server error aa raha hai. Please thodi der baad retry karein.";
  return data.message || data.error || fallback;
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function shouldRefreshBeforeRequest(session) {
  if (!session?.token || !session?.refreshToken) return false;
  const payload = decodeJwtPayload(session.token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 - Date.now() < 60_000;
}

async function performTokenRefresh() {
  const session = getSession();
  if (!session?.refreshToken) return null;

  const response = await fetch(`${API_BASE}/auth/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  const responseBody = await readResponseBody(response);
  if (!response.ok) {
    clearSession();
    throw new Error(responseBody.message || "Your session has expired. Please login again.");
  }

  const data = responseBody.data || responseBody;
  const token = data.accessToken || data.token;
  if (!token) {
    clearSession();
    throw new Error("Unable to renew your session. Please login again.");
  }
  const nextSession = {
    ...session,
    token,
    refreshToken: data.refreshToken || session.refreshToken,
    user: data.user || session.user,
    role: data.user?.role || session.role,
  };
  setSession(nextSession, localStorage.getItem("rozgar_session") !== null);
  return { ...data, token };
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = performTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function getRequestSession(path) {
  const session = getSession();
  if (path === "/auth/refresh-token" || !shouldRefreshBeforeRequest(session)) return session;
  try {
    await refreshAccessToken();
    return getSession();
  } catch {
    return getSession();
  }
}

export async function apiFetch(path, options = {}) {
  const session = await getRequestSession(path);
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers,
      ...options,
    });
  } catch (error) {
    throw new ApiNetworkError(NETWORK_ERROR_MESSAGE, error);
  }
  let data = await readResponseBody(response);

  if (response.status === 401 && session?.refreshToken && path !== "/auth/refresh-token") {
    const refreshData = await refreshAccessToken();
    if (refreshData?.accessToken || refreshData?.token) {
      const retrySession = getSession();
      const retryHeaders = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      };
      if (retrySession?.token) retryHeaders.Authorization = `Bearer ${retrySession.token}`;
      try {
        response = await fetch(`${API_BASE}${path}`, {
          headers: retryHeaders,
          ...options,
        });
      } catch (error) {
        throw new ApiNetworkError(NETWORK_ERROR_MESSAGE, error);
      }
      data = await readResponseBody(response);
    }
  }

  if (response.status === 401 && session?.token && !session?.refreshToken && !path.startsWith("/auth/")) {
    clearSession();
  }

  if (!response.ok) {
    throw new Error(errorMessageFromResponse(response, data));
  }
  if (data?.success === false && data?.code === "SERVICE_UNAVAILABLE") {
    setBackendOffline(true);
    throw new ApiNetworkError(data.message || NETWORK_ERROR_MESSAGE);
  }
  setBackendOffline(false);
  return data;
}

export async function apiUpload(path, formData, options = {}) {
  const session = await getRequestSession(path);
  const headers = {
    ...(options.headers || {}),
  };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method || "POST",
      headers,
      body: formData,
      ...options,
    });
  } catch (error) {
    throw new ApiNetworkError(NETWORK_ERROR_MESSAGE, error);
  }
  let data = await readResponseBody(response);

  if (response.status === 401 && session?.refreshToken && path !== "/auth/refresh-token") {
    const refreshData = await refreshAccessToken();
    if (refreshData?.accessToken || refreshData?.token) {
      const retrySession = getSession();
      const retryHeaders = {
        ...(options.headers || {}),
      };
      if (retrySession?.token) retryHeaders.Authorization = `Bearer ${retrySession.token}`;
      try {
        response = await fetch(`${API_BASE}${path}`, {
          method: options.method || "POST",
          headers: retryHeaders,
          body: formData,
          ...options,
        });
      } catch (error) {
        throw new ApiNetworkError(NETWORK_ERROR_MESSAGE, error);
      }
      data = await readResponseBody(response);
    }
  }

  if (!response.ok) {
    throw new Error(errorMessageFromResponse(response, data, "Upload failed"));
  }
  if (data?.success === false && data?.code === "SERVICE_UNAVAILABLE") {
    setBackendOffline(true);
    throw new ApiNetworkError(data.message || NETWORK_ERROR_MESSAGE);
  }
  setBackendOffline(false);
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
