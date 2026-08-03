import { apiFetch } from "../../utils/auth.js";

export const modules = [
  { key: "dashboard", label: "Dashboard", group: "Overview", icon: "📊", description: "Live metrics and website control" },
  { key: "analytics", label: "Analytics", group: "Overview", icon: "📈", description: "Growth trends and platform performance" },
  { key: "reports", label: "Reports", group: "Overview", icon: "🧾", description: "Status breakdowns and insights" },
  { key: "candidates", label: "Candidates", group: "Management", icon: "🧑‍💼", description: "Candidate verification and accounts" },
  { key: "employers", label: "Employers", group: "Management", icon: "🏢", description: "Employer accounts and company profiles" },
  { key: "admins", label: "Admins", group: "Management", icon: "🛡️", description: "Platform administrators and super admins" },
  { key: "room-owners", label: "Room Owners", group: "Management", icon: "🏠", description: "Room owner accounts and listings" },
  { key: "jobs", label: "Jobs Verification", group: "Reviews", icon: "💼", description: "Approve jobs before they go live", filter: "pending" },
  { key: "rooms", label: "Rooms Verification", group: "Reviews", icon: "🏨", description: "Approve room listings before publication", filter: "pending" },
  { key: "applications", label: "Applications", group: "Reviews", icon: "📄", description: "Manage candidate applications and hiring" },
  { key: "bookings", label: "Bookings", group: "Management", icon: "🗓️", description: "Monitor room bookings and confirmations" },
  { key: "complaints", label: "Complaints", group: "Reviews", icon: "🛠️", description: "Resolve complaints and platform issues" },
  { key: "notifications", label: "Notifications", group: "Tools", icon: "🔔", description: "Send announcements and alerts" },
  { key: "system-logs", label: "System Logs", group: "Tools", icon: "🧾", description: "Audit trail and admin event history" },
  { key: "settings", label: "Settings", group: "Tools", icon: "⚙️", description: "Platform settings and admin preferences" },
];

export const moduleTitles = Object.fromEntries(modules.map((item) => [item.key, item.label]));

export const statusOptions = {
  candidates: ["pending", "verified", "rejected", "suspended", "unverified"],
  employers: ["pending", "verified", "rejected", "suspended", "unverified"],
  "room-owners": ["pending", "verified", "rejected", "suspended", "unverified"],
  jobs: ["pending", "live", "rejected"],
  rooms: ["pending", "live", "rejected"],
  applications: ["submitted", "shortlisted", "interview", "hired", "rejected"],
  bookings: ["pending", "confirmed", "completed", "cancelled", "rejected"],
  complaints: ["open", "inReview", "resolved", "rejected"],
  notifications: ["draft", "sent", "failed", "read", "unread"],
};

export async function adminFetch(path, options = {}) {
  return apiFetch(path, options);
}

const fallback = (value) => value || "-";

export function pickName(item, moduleKey) {
  if (!item) return fallback();
  if (moduleKey === "candidates") return item.fullName || item.email || fallback();
  if (moduleKey === "employers") return item.companyName || item.email || item.companyEmail || fallback();
  if (moduleKey === "room-owners") return item.propertyName || item.email || fallback();
  if (moduleKey === "applications") return item.candidate?.fullName || item.candidate?.email || item.job?.title || fallback();
  if (moduleKey === "bookings") return item.room?.title || item.user?.fullName || fallback();
  if (moduleKey === "complaints") return item.subject || item.module || fallback();
  if (moduleKey === "notifications") return item.title || fallback();
  return item.title || item.postId || item.roomId || item._id?.slice(-8) || fallback();
}

export function pickEmail(item, moduleKey) {
  if (!item) return fallback();
  if (["candidates", "employers", "room-owners"].includes(moduleKey)) return item.companyEmail || item.email || fallback();
  if (moduleKey === "jobs") return item.employer?.companyEmail || item.employer?.email || item.companyName || fallback();
  if (moduleKey === "rooms") return item.owner?.email || item.propertyName || fallback();
  if (moduleKey === "applications") return item.employer?.companyName || item.employer?.email || fallback();
  if (moduleKey === "bookings") return item.owner?.email || item.user?.email || fallback();
  if (moduleKey === "system-logs") return item.actor?.email || item.actorRole || fallback();
  return item.channel || item.status || fallback();
}

export function pickMeta(item, moduleKey) {
  if (!item) return fallback();
  if (["candidates", "room-owners"].includes(moduleKey)) return item.mobile || item.address || fallback();
  if (moduleKey === "employers") return item.companyPhone || item.companyLocation || fallback();
  if (moduleKey === "jobs") return item.salary || item.role || fallback();
  if (moduleKey === "rooms") return item.rent || item.roomType || fallback();
  if (moduleKey === "applications") return item.job?.title || item.status || fallback();
  if (moduleKey === "bookings") return [item.visitDate, item.visitTime].filter(Boolean).join(" ") || fallback();
  if (moduleKey === "complaints") return item.module || fallback();
  if (moduleKey === "system-logs") return item.module || item.entityModel || fallback();
  return item.createdAt ? new Date(item.createdAt).toLocaleDateString() : fallback();
}
