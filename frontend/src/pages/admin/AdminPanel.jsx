import { useEffect, useMemo, useState } from "react";
import { adminFetch, modules } from "./adminApi.js";
import Analytics from "./Analytics.jsx";
import Admins from "./Admins.jsx";
import Applications from "./Applications.jsx";
import Bookings from "./Bookings.jsx";
import Candidates from "./Candidates.jsx";
import Complaints from "./Complaints.jsx";
import Dashboard from "./Dashboard.jsx";
import Employers from "./Employers.jsx";
import JobsVerification from "./JobsVerification.jsx";
import Notifications from "./Notifications.jsx";
import Reports from "./Reports.jsx";
import RoomOwners from "./RoomOwners.jsx";
import RoomsVerification from "./RoomsVerification.jsx";
import Settings from "./Settings.jsx";
import SystemLogs from "./SystemLogs.jsx";

const pages = {
  dashboard: Dashboard,
  candidates: Candidates,
  employers: Employers,
  admins: Admins,
  "room-owners": RoomOwners,
  jobs: JobsVerification,
  rooms: RoomsVerification,
  applications: Applications,
  bookings: Bookings,
  complaints: Complaints,
  reports: Reports,
  notifications: Notifications,
  settings: Settings,
  analytics: Analytics,
  "system-logs": SystemLogs,
};

export default function AdminPanel() {
  const [active, setActive] = useState("dashboard");
  const [overview, setOverview] = useState(null);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const ActivePage = useMemo(() => pages[active] || Dashboard, [active]);

  const groupedModules = useMemo(() => modules.reduce((groups, item) => {
    const group = item.group || "Other";
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
    return groups;
  }, {}), []);

  useEffect(() => {
    setSidebarLoading(true);
    adminFetch("/admin/dashboard/analytics")
      .then((result) => setOverview(result.data || result))
      .catch(() => setOverview(null))
      .finally(() => setSidebarLoading(false));
  }, []);

  const totals = overview?.totals || {};
  const summary = overview?.statusSummary || {};
  const totalUsers = (totals.users || 0) + (totals.employers || 0) + (totals.roomOwners || 0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <section className="admin-shell">
      <button type="button" className="admin-sidebar-toggle" onClick={() => setSidebarOpen((prev) => !prev)}>
        {sidebarOpen ? "Close menu" : "Open menu"}
      </button>
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="nav-logo">
          <span className="logo-icon">RM</span>
          <div>
            <span className="logo-hindi">Admin</span>
            <span className="logo-en">Control Center</span>
          </div>
        </div>

        <div className="admin-sidebar-summary">
          <div className="summary-title">Live Snapshot</div>
          <div className="summary-grid">
            <div>
              <span>{totalUsers || "—"}</span>
              <small>Users</small>
            </div>
            <div>
              <span>{totals.jobs ?? "—"}</span>
              <small>Jobs</small>
            </div>
            <div>
              <span>{totals.rooms ?? "—"}</span>
              <small>Rooms</small>
            </div>
          </div>
          <div className="summary-footer">
            <span>{sidebarLoading ? "Loading…" : `${summary.pendingJobs || 0} jobs pending`}</span>
            <span>{sidebarLoading ? "" : `${summary.pendingRooms || 0} rooms pending`}</span>
          </div>
        </div>

        <div className="sidebar-divider" />
        {Object.entries(groupedModules).map(([group, items]) => (
          <div key={group} className="sidebar-group">
            <div className="sidebar-heading">{group}</div>
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`admin-nav ${active === item.key ? "active" : ""}`}
                onClick={() => setActive(item.key)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}
      </aside>
      <main className="admin-main">
        <ActivePage onNavigate={setActive} overview={overview} />
      </main>
    </section>
  );
}
