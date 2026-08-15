import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, Clock, RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/button.jsx";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "../../utils/notification.js";
import { useToast } from "../../contexts/ToastContext.jsx";
import { getSession } from "../../utils/auth.js";
import { cn } from "../../lib/utils.js";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EmployerNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const toast = useToast();
  const role = getSession()?.role;
  const label = role === "roomOwner" ? "Room owner notifications" : "Company notifications";
  const description = role === "roomOwner" ? "Admin decisions, visit requests, booking confirmations and system alerts appear here." : "Admin decisions, candidate applications, interview updates and system alerts appear here.";

  const unreadCount = useMemo(() => items.filter((item) => item.status === "unread").length, [items]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await fetchNotifications());
    } catch (err) {
      setError(err.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function readOne(item) {
    if (item.status === "read") return;
    setBusy(item._id);
    try {
      await markNotificationRead(item._id);
      setItems((current) => current.map((row) => row._id === item._id ? { ...row, status: "read" } : row));
    } catch (err) {
      toast.show(err.message || "Unable to mark notification read", "error");
    } finally {
      setBusy("");
    }
  }

  async function readAll() {
    setBusy("all");
    try {
      await markAllNotificationsRead();
      setItems((current) => current.map((row) => ({ ...row, status: "read" })));
      toast.show("All notifications marked as read", "success");
    } catch (err) {
      toast.show(err.message || "Unable to mark notifications read", "error");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="bg-background">
      <div className="mesh-bg border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Bell className="size-3.5 text-signal" />
                {label}
              </div>
              <h1 className="mt-4 font-display text-4xl font-bold">Notification center</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={load}><RefreshCw className="size-4" />Refresh</Button>
              <Button variant="signal" disabled={!unreadCount || busy === "all"} onClick={readAll}><CheckCheck className="size-4" />Mark all read</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {error ? <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</div> : null}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <Metric label="Total notifications" value={items.length} />
          <Metric label="Unread" value={unreadCount} />
          <Metric label="Read" value={items.length - unreadCount} />
        </div>

        <div className="grid gap-3">
          {loading ? <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-float">Loading notifications...</div> : null}
          {!loading && items.length ? items.map((item) => (
            <article key={item._id} className={cn("rounded-2xl border bg-card p-5 shadow-float transition hover:-translate-y-0.5 hover:shadow-lift", item.status === "unread" ? "border-signal/50" : "border-border")}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-semibold">{item.title || "Notification"}</h2>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize", item.status === "unread" ? "bg-signal/15 text-foreground" : "bg-muted text-muted-foreground")}>{item.status || "read"}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body || "-"}</p>
                  <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Clock className="size-3.5 text-signal" />
                    {formatDate(item.createdAt)}
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled={item.status === "read" || busy === item._id} onClick={() => readOne(item)}>
                  {busy === item._id ? "Updating..." : "Mark read"}
                </Button>
              </div>
            </article>
          )) : null}
          {!loading && !items.length ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-float">
              <Bell className="mx-auto size-8 text-signal" />
              <h2 className="mt-4 font-display text-xl font-semibold">No notifications yet</h2>
              <p className="mt-2 text-sm text-muted-foreground">New admin updates and account activity will appear here automatically.</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-float">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <strong className="mt-2 block font-display text-3xl font-bold">{value}</strong>
    </div>
  );
}
