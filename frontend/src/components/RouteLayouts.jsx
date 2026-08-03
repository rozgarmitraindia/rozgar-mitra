import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { getSession } from "../utils/auth.js";

const roleSidebars = {
  candidate: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Browse Jobs", path: "/jobs" },
    { label: "Browse Rooms", path: "/rooms" },
    { label: "Saved Jobs", path: "/saved-jobs" },
    { label: "Applied Jobs", path: "/applied-jobs" },
    { label: "Interviews", path: "/interviews" },
    { label: "Notifications", path: "/notifications" },
    { label: "Profile", path: "/profile" },
    { label: "Settings", path: "/settings" },
  ],
  employer: [
    { label: "Dashboard", path: "/employer/dashboard" },
    { label: "Post Job", path: "/post-job" },
    { label: "My Jobs", path: "/employer/jobs" },
    { label: "Applications", path: "/employer/applications" },
    { label: "Profile", path: "/employer/profile" },
    { label: "Settings", path: "/employer/settings" },
  ],
  roomOwner: [
    { label: "Dashboard", path: "/room-owner/dashboard" },
    { label: "Post Room", path: "/post-room" },
    { label: "My Rooms", path: "/room-owner/rooms" },
    { label: "Visit Requests", path: "/room-owner/visit-requests" },
    { label: "Bookings", path: "/room-owner/bookings" },
    { label: "Profile", path: "/room-owner/profile" },
    { label: "Settings", path: "/room-owner/settings" },
  ],
  admin: [
    { label: "Admin Panel", path: "/admin" },
  ],
};

const breadcrumbMap = {
  candidate: "Candidate",
  employer: "Employer",
  roomOwner: "Room Owner",
  admin: "Admin",
  superAdmin: "Super Admin",
  dashboard: "Dashboard",
  profile: "Profile",
  "edit-profile": "Edit Profile",
  resume: "Resume",
  "saved-jobs": "Saved Jobs",
  "applied-jobs": "Applied Jobs",
  interviews: "Interviews",
  notifications: "Notifications",
  settings: "Settings",
  jobs: "Jobs",
  rooms: "Rooms",
  applications: "Applications",
  "post-job": "Post Job",
  "post-room": "Post Room",
  "visit-requests": "Visit Requests",
  bookings: "Bookings",
  analytics: "Analytics",
  reports: "Reports",
  complaints: "Complaints",
  "system-logs": "System Logs",
  about: "About",
  contact: "Contact",
};

function Breadcrumbs() {
  const location = useLocation();
  const parts = location.pathname.split("/").filter(Boolean);
  const crumbs = useMemo(
    () => parts.map((segment, index) => {
      const path = `/${parts.slice(0, index + 1).join("/")}`;
      return {
        path,
        label: breadcrumbMap[segment] || segment.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
      };
    }),
    [parts],
  );

  if (!crumbs.length) return null;

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {crumbs.map((crumb, index) => (
        <span key={crumb.path} className="breadcrumb-item">
          {index > 0 && <span className="breadcrumb-separator">›</span>}
          <NavLink to={crumb.path} className="breadcrumb-link">
            {crumb.label}
          </NavLink>
        </span>
      ))}
    </nav>
  );
}

export function PublicLayout() {
  return <Outlet />;
}

export function RoleLayout({ role, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const session = getSession();
  const location = useLocation();
  const menuItems = roleSidebars[session?.role] || roleSidebars[role] || [];
  const currentRoleName = breadcrumbMap[session?.role] || breadcrumbMap[role] || "Account";

  return (
    <section className="role-shell">
      <div className="role-header-row">
        <div>
          <div className="section-label">{currentRoleName} Dashboard</div>
          <h1 className="section-title">{breadcrumbMap[location.pathname.split("/").filter(Boolean).slice(-1)[0]] || currentRoleName}</h1>
          <Breadcrumbs />
        </div>
        <button type="button" className="mobile-toggle role-sidebar-toggle" onClick={() => setSidebarOpen((prev) => !prev)}>
          {sidebarOpen ? "Close menu" : "Menu"}
        </button>
      </div>

      <div className="role-layout">
        <aside className={`role-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="role-sidebar-title">{currentRoleName}</div>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `role-nav-link ${isActive ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </aside>

        <main className="role-main">
          {children || <Outlet />}
        </main>
      </div>
    </section>
  );
}
