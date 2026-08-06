import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, Briefcase, ChevronDown, Home, Languages, LogOut, Menu, PlusCircle, UserRound, X } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext.jsx";
import { useToast } from "../contexts/ToastContext.jsx";
import { clearSession, getSession } from "../utils/auth.js";
import { fetchUnreadCount, onNotificationCountChange, subscribeNotifications } from "../utils/notification.js";
import { cn } from "../lib/utils.js";
import { Button } from "./ui/button.jsx";

const publicLinks = [
  { key: "nav.home", fallback: "Home", path: "/", icon: Home },
  { key: "nav.jobs", fallback: "Jobs", path: "/jobs", icon: Briefcase },
  { key: "nav.rooms", fallback: "Rooms", path: "/rooms", icon: Home },
  { key: "nav.postJob", fallback: "Post Job", path: "/post-job", icon: PlusCircle },
  { key: "nav.postRoom", fallback: "Post Room", path: "/post-room", icon: PlusCircle },
  { key: "nav.about", fallback: "About", path: "/about" },
  { key: "nav.contact", fallback: "Contact", path: "/contact" },
];

const profileLinks = {
  candidate: [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Browse Jobs", path: "/jobs" },
    { label: "Browse Rooms", path: "/rooms" },
    { label: "Saved Jobs", path: "/saved-jobs" },
    { label: "Applied Jobs", path: "/applied-jobs" },
    { label: "Notifications", path: "/notifications" },
    { label: "Profile", path: "/profile" },
    { label: "Settings", path: "/settings" },
  ],
  employer: [
    { label: "Dashboard", path: "/employer/dashboard" },
    { label: "Post Job", path: "/post-job" },
    { label: "My Jobs", path: "/employer/jobs" },
    { label: "Applications", path: "/employer/applications" },
    { label: "Notifications", path: "/employer/notifications" },
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
  admin: [{ label: "Admin Panel", path: "/admin" }],
};

function getDisplayName(session) {
  return session?.name || session?.user?.fullName || session?.user?.name || session?.user?.companyName || session?.companyName || "User";
}

function getRoleLabel(role) {
  if (role === "roomOwner") return "Room Owner";
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "Member";
}

function BrandMark({ onClick }) {
  return (
    <NavLink to="/" onClick={onClick} className="inline-flex min-w-0 items-center gap-3" data-no-translate translate="no">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-ink text-sm font-bold text-background">रो</span>
      <span className="min-w-0">
        <span className="block truncate font-display text-[15px] font-bold tracking-tight text-foreground">ROZGAR MITRA</span>
        <span className="block truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Jobs · Rooms · Growth</span>
      </span>
    </NavLink>
  );
}

function HeaderLink({ item, label, onClick }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={({ isActive }) => cn(
        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground",
        isActive && "bg-accent text-accent-foreground",
      )}
    >
      {Icon ? <Icon className="size-4" /> : null}
      {label}
    </NavLink>
  );
}

function ProfileLinkButton({ link, unreadCount, onClick }) {
  return (
    <button type="button" className="rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition hover:bg-accent hover:text-accent-foreground" onClick={() => onClick(link.path)}>
      <span className="inline-flex w-full items-center justify-between gap-3">
        <span>{link.label}</span>
        {link.label === "Notifications" && unreadCount > 0 ? <span className="size-2 rounded-full bg-destructive" aria-label={`${unreadCount} unread notifications`} /> : null}
      </span>
    </button>
  );
}

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
  const displayName = getDisplayName(session);
  const firstName = displayName.split(" ")[0];
  const role = session?.role || session?.user?.role;

  useEffect(() => {
    function handleClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    }
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setSession(getSession());
    setOpen(false);
    setMenuOpen(false);
  }, [location]);

  useEffect(() => {
    let cleanup = () => {};
    async function loadUnreadCount() {
      if (!loggedIn) {
        setUnreadCount(0);
        return;
      }
      try {
        setUnreadCount((await fetchUnreadCount()) || 0);
      } catch {
        setUnreadCount(0);
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

  useEffect(() => {
    if (!loggedIn) return undefined;
    return onNotificationCountChange(async (nextCount) => {
      if (typeof nextCount === "number") {
        setUnreadCount(Math.max(nextCount, 0));
        return;
      }
      try {
        setUnreadCount((await fetchUnreadCount()) || 0);
      } catch {
        setUnreadCount(0);
      }
    });
  }, [loggedIn]);

  function handleLogout() {
    clearSession();
    setSession(null);
    setMenuOpen(false);
    setOpen(false);
    toast.show("Logged out successfully", "success");
    navigate("/", { replace: true });
  }

  function go(path) {
    setMenuOpen(false);
    setOpen(false);
    navigate(path);
  }

  return (
    <header className="glass sticky top-0 z-50 border-b border-border/70">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-8">
          <BrandMark onClick={() => setOpen(false)} />
          <nav className="hidden items-center gap-1 lg:flex">
            {publicLinks.map((item) => <HeaderLink key={item.path} item={item} label={t(item.key, item.fallback)} />)}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button data-no-translate translate="no" variant="ghost" size="sm" onClick={toggle} aria-label="Toggle language">
            <Languages className="size-4" />
            {lang === "en" ? "EN" : "हि"}
          </Button>

          {!loggedIn ? (
            <>
              <Button className="hidden sm:inline-flex" variant="outline" size="sm" onClick={() => navigate("/login")}>{t("nav.login", "Login")}</Button>
              <Button className="hidden sm:inline-flex" variant="signal" size="sm" onClick={() => navigate("/register")}>Join Now</Button>
            </>
          ) : (
            <div ref={menuRef} className="relative hidden sm:block">
              <button type="button" onClick={() => setMenuOpen((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-2.5 text-sm font-semibold text-foreground shadow-float transition hover:bg-accent">
                <span className="relative grid size-8 place-items-center rounded-lg bg-gradient-signal text-sm font-bold text-signal-foreground">
                  {displayName[0]?.toUpperCase() || "U"}
                  {unreadCount > 0 ? <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] text-background">{unreadCount}</span> : null}
                </span>
                <span className="max-w-24 truncate">{firstName}</span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>

              {menuOpen ? (
                <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-border bg-card p-3 shadow-lift">
                  <div className="border-b border-border px-2 pb-3">
                    <strong className="block truncate text-sm">{displayName}</strong>
                    <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><UserRound className="size-3.5" />{getRoleLabel(role)}</span>
                  </div>
                  <div className="mt-2 grid gap-1">
                    {(profileLinks[role] || []).map((link) => <ProfileLinkButton key={link.path} link={link} unreadCount={unreadCount} onClick={go} />)}
                    <button type="button" className="mt-1 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-destructive transition hover:bg-destructive/10" onClick={handleLogout}>
                      <LogOut className="size-4" />
                      Logout
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <Button className="lg:hidden" variant="ghost" size="icon" onClick={() => setOpen((value) => !value)} aria-label="Toggle menu">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-border bg-card px-4 py-4 shadow-lift lg:hidden">
          <nav className="mx-auto grid max-w-7xl gap-2">
            {publicLinks.map((item) => <HeaderLink key={item.path} item={item} label={t(item.key, item.fallback)} onClick={() => setOpen(false)} />)}
            {!loggedIn ? (
              <div className="mt-2 grid gap-2 sm:hidden">
                <Button variant="outline" onClick={() => go("/login")}>{t("nav.login", "Login")}</Button>
                <Button variant="signal" onClick={() => go("/register")}>Join Now</Button>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-border bg-surface p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <span className="grid size-9 place-items-center rounded-xl bg-gradient-signal text-signal-foreground">{displayName[0]?.toUpperCase() || "U"}</span>
                  <span className="min-w-0">
                    <span className="block truncate">{displayName}</span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Bell className="size-3.5" />{unreadCount} notifications</span>
                  </span>
                </div>
                <div className="grid gap-1">
                  {(profileLinks[role] || []).map((link) => <ProfileLinkButton key={link.path} link={link} unreadCount={unreadCount} onClick={go} />)}
                  <button type="button" className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-destructive hover:bg-destructive/10" onClick={handleLogout}>Logout</button>
                </div>
              </div>
            )}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
