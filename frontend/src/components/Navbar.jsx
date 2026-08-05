import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { clearSession, getSession, isLoggedIn } from "../utils/auth.js";
import { fetchUnreadCount, subscribeNotifications } from "../utils/notification.js";
const links = [
  { key: "nav.home", path: "/" },
  { key: "nav.jobs", path: "/jobs" },
  { key: "nav.rooms", path: "/rooms" },
  { key: "nav.postJob", path: "/post-job" },
  { key: "nav.postRoom", path: "/post-room" },
  { key: "nav.about", path: "/about" },
  { key: "nav.contact", path: "/contact" },
  { key: "nav.login", path: "/login" },
  { key: "nav.joinFree", path: "/join-free", cta: true },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { lang, toggle, t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);
  const [session, setSession] = useState(getSession());
  const [unreadCount, setUnreadCount] = useState(0);
  const loggedIn = Boolean(session?.token);

  useEffect(() => {
    function handleClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setSession(getSession());
  }, [location]);

  useEffect(() => {
    let cleanup = () => {};
    async function loadUnreadCount() {
      if (!loggedIn) {
        setUnreadCount(0);
        return;
      }

      try {
        const count = await fetchUnreadCount();
        setUnreadCount(count || 0);
      } catch (err) {
        console.error("Unable to load unread notifications", err);
      }
    }

    loadUnreadCount();

    if (loggedIn) {
      cleanup = subscribeNotifications((payload) => {
        setUnreadCount((current) => current + 1);
        toast.show(`${payload.title || "New notification"}: ${payload.body || payload.data?.body || "You have a new update."}`, "info", 7000);
      });
    }

    return cleanup;
  }, [loggedIn, toast]);

  const profileLinks = {
    candidate: [
      { label: "Dashboard", path: "/dashboard" },
      { label: "Browse Jobs", path: "/jobs" },
      { label: "Saved Jobs", path: "/saved-jobs" },
      { label: "Saved Rooms", path: "/rooms" },
      { label: "Applied Jobs", path: "/applied-jobs" },
    ],
    employer: [
      { label: "Dashboard", path: "/employer/dashboard" },
      { label: "Profile", path: "/employer/profile" },
      { label: "Settings", path: "/employer/settings" },
      { label: "Post Job", path: "/post-job" },
      { label: "My Jobs", path: "/employer/jobs" },
      { label: "Applications", path: "/employer/applications" },
    ],
    roomOwner: [
      { label: "Dashboard", path: "/room-owner/dashboard" },
      { label: "Profile", path: "/room-owner/profile" },
      { label: "Settings", path: "/room-owner/settings" },
      { label: "Post Room", path: "/post-room" },
      { label: "My Rooms", path: "/room-owner/rooms" },
      { label: "Visit Requests", path: "/room-owner/visit-requests" },
      { label: "Bookings", path: "/room-owner/bookings" },
    ],
    admin: [
      { label: "Admin Panel", path: "/admin" },
      { label: "Analytics", path: "/admin/analytics" },
      { label: "Reports", path: "/admin/reports" },
      { label: "Notifications", path: "/admin/notifications" },
    ],
  };

  function handleLogout() {
    clearSession();
    setMenuOpen(false);
    toast.show("Logged out successfully", "success");
    navigate("/", { replace: true });
  }

  return (
    <nav className="navbar">
      <NavLink className="nav-logo" to="/" onClick={() => setOpen(false)}>
        <span className="logo-icon">RM</span>
        <span>
          <span className="logo-hindi">रोज़गार मित्र</span>
          <span className="logo-en">Jobs Rooms Growth</span>
        </span>
      </NavLink>

      <button className="mobile-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-label="Toggle menu">
        {open ? "×" : "☰"}
      </button>

      <div className={`nav-links ${open ? "open" : ""}`}>
        {links.filter((item) => !loggedIn || !["/login", "/join-free"].includes(item.path)).map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            onClick={() => setOpen(false)}
            className={({ isActive }) => `nav-link ${link.cta ? "nav-cta" : ""} ${isActive ? "active" : ""}`}
          >
            {t(link.key)}
          </NavLink>
        ))}
        {loggedIn ? (
          <div ref={menuRef} className="profile-menu-root">
            <button type="button" className="nav-link nav-profile" onClick={() => setMenuOpen((value) => !value)}>
              <span className="profile-icon">{session?.name?.[0] || "U"}</span>
              <span>{session?.name?.split(" ")[0] || "Dashboard"}</span>
              {unreadCount > 0 ? <span className="notification-badge">{unreadCount}</span> : null}
            </button>
            {menuOpen ? (
              <div className="profile-dropdown">
                <div className="profile-dropdown-header">
                  <strong>{session?.name || "User"}</strong>
                  <span>{session?.role || "Member"}</span>
                </div>
                {(profileLinks[session?.role] || []).map((link) => (
                  <button
                    key={link.path}
                    type="button"
                    className="profile-dropdown-item"
                    onClick={() => {
                      setMenuOpen(false);
                      setOpen(false);
                      navigate(link.path);
                    }}
                  >
                    {link.label}
                  </button>
                ))}
                <div className="profile-dropdown-divider" />
                <button type="button" className="profile-dropdown-item logout" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {loggedIn && session?.role && open ? (
          <div className="mobile-account-section">
            <div className="mobile-account-title">
              {session.role === "candidate" ? "Candidate Account" : session.role === "employer" ? "Employer Account" : "Room Owner Account"}
            </div>
            {(profileLinks[session.role] || []).map((link) => (
              <button
                key={link.path}
                type="button"
                className="nav-link mobile-account-link"
                onClick={() => {
                  setOpen(false);
                  navigate(link.path);
                }}
              >
                {link.label}
              </button>
            ))}
          </div>
        ) : null}
        <button
          className="nav-link nav-lang"
          onClick={toggle}
          style={{
            marginLeft: 8,
            borderRadius: 6,
            padding: "6px 8px",
            minWidth: 44,
            textAlign: "center",
            backgroundColor: lang === "hi" ? "#fde68a" : "#ffffff",
            color: lang === "hi" ? "#92400e" : "#e52424",
            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          {lang === "en" ? "EN" : "HI"}
        </button>
      </div>
    </nav>
  );
}
