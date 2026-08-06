import { useEffect, useState } from "react";
import { RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { adminFetch, moduleTitles, modules, pickName, pickEmail, pickMeta, statusOptions } from "./adminApi.js";
import DetailPanel from "./DetailPanel.jsx";
import { useToast } from "../../contexts/ToastContext.jsx";

export default function ListModule({ moduleKey, refreshToken = 0 }) {
  const toast = useToast();
  const moduleConfig = modules.find((item) => item.key === moduleKey);
  const defaultStatus = moduleConfig?.filter || "";
  const storageKey = `admin:list:${moduleKey}`;
  const storedState = (() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(storedState?.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
  const [search, setSearch] = useState(storedState?.search || "");
  const [status, setStatus] = useState(storedState?.status ?? defaultStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [activity, setActivity] = useState([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load(page = 1) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pagination.limit) });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const result = await adminFetch(`/admin/${moduleKey}?${params}`);
      const data = result.data || result;
      setItems(data.items || []);
      const nextPagination = data.pagination || { ...pagination, page };
      setPagination(nextPagination);
      sessionStorage.setItem(storageKey, JSON.stringify({ search, status, pagination: nextPagination }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function openDetails(item) {
    setError("");
    try {
      const result = await adminFetch(`/admin/${moduleKey}/${item._id}`);
      const data = result.data || result;
      setSelected(data.item);
      setActivity(data.activity || []);
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateStatus(nextStatus, needsReason = false) {
    const requiresReason = needsReason || nextStatus === "rejected";
    const reason = requiresReason ? window.prompt("Reason required") : "";
    if (requiresReason && !String(reason || "").trim()) {
      toast.show("Reason is compulsory", "error");
      return;
    }

    setUpdatingStatus(true);
    setError("");
    try {
      const result = await adminFetch(`/admin/${moduleKey}/${selected._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, reason }),
      });
      const data = result.data || result;
      setSelected(data.item);
      await load(pagination.page);
      await openDetails(data.item);
      toast.show(`${moduleTitles[moduleKey]} status updated to ${data.item?.status || nextStatus}`, "success");
    } catch (err) {
      setError(err.message);
      toast.show(err.message || "Status update failed", "error");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function deleteJob(target = selected) {
    if (!target?._id || moduleKey !== "jobs") return;
    const reason = window.prompt(`Delete reason required for "${target.title || "this job"}"`);
    if (!String(reason || "").trim()) {
      toast.show("Delete reason is compulsory", "error");
      return;
    }
    const confirmed = window.confirm(`Permanently delete "${target.title || "this job"}"? It will be removed from the landing page and Jobs page. Related applications will also be deleted.`);
    if (!confirmed) return;

    setDeleting(true);
    setError("");
    try {
      const result = await adminFetch(`/admin/jobs/${target._id}`, {
        method: "DELETE",
        body: JSON.stringify({ reason }),
      });
      setSelected(null);
      setActivity([]);
      await load(1);
      toast.show(result.message || "Job permanently deleted", "success");
    } catch (err) {
      setError(err.message);
      toast.show(err.message || "Unable to delete job", "error");
    } finally {
      setDeleting(false);
    }
  }

  async function deleteAccount(target = selected) {
    if (!target?._id || !["candidates", "employers", "room-owners"].includes(moduleKey)) return;
    const label = pickName(target, moduleKey);
    const reason = window.prompt(`Permanent account delete reason required for "${label}"`);
    if (!String(reason || "").trim()) {
      toast.show("Delete reason is compulsory", "error");
      return;
    }
    if (!window.confirm(`Permanently delete "${label}" account? Related records may also be removed.`)) return;

    setDeleting(true);
    setError("");
    try {
      const result = await adminFetch(`/admin/${moduleKey}/${target._id}`, {
        method: "DELETE",
        body: JSON.stringify({ reason }),
      });
      setSelected(null);
      setActivity([]);
      await load(1);
      toast.show(result.message || "Account permanently deleted", "success");
    } catch (err) {
      setError(err.message);
      toast.show(err.message || "Unable to delete account", "error");
    } finally {
      setDeleting(false);
    }
  }

  async function deleteNotification(target = selected) {
    if (!target?._id || moduleKey !== "notifications") return;
    if (!window.confirm(`Permanently delete notification "${target.title || "Notification"}"?`)) return;

    setDeleting(true);
    setError("");
    try {
      const result = await adminFetch(`/admin/notifications/${target._id}`, { method: "DELETE" });
      if (selected?._id === target._id) {
        setSelected(null);
        setActivity([]);
      }
      await load(pagination.page);
      toast.show(result.message || "Notification permanently deleted", "success");
    } catch (err) {
      setError(err.message);
      toast.show(err.message || "Unable to delete notification", "error");
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    load(pagination.page);
  }, [moduleKey, status, refreshToken]);

  return (
    <div className={`admin-content-grid ${selected ? "has-detail" : "is-list-only"}`}>
      <section className="form-card admin-module-card">
        <div className="admin-list-head">
          <div>
            <div className="section-label">Admin Review Desk</div>
            <h1 className="form-title">{moduleTitles[moduleKey]}</h1>
            <p className="section-desc">{moduleConfig?.description || "Review records, documents, status changes and activity in one place."}</p>
          </div>
          <button className="btn-search admin-icon-button" type="button" onClick={() => load(1)} disabled={loading}>
            <RefreshCw size={16} className={loading ? "admin-spin" : ""} />
            {loading ? "Refreshing" : "Refresh"}
          </button>
        </div>
        <div className="admin-metric-strip">
          <div><span>Total</span><strong>{pagination.total || items.length}</strong></div>
          <div><span>Showing</span><strong>{items.length}</strong></div>
          <div><span>Filter</span><strong>{status || "All"}</strong></div>
        </div>
        {error ? <div className="login-error">{error}</div> : null}
        <div className="admin-toolbar">
          <label className="admin-search-field">
            <Search size={16} />
            <input className="form-input" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && load(1)} placeholder="Search by name, email, ID, title..." />
          </label>
          <label className="admin-select-field">
            <SlidersHorizontal size={16} />
            <select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All Status</option>
              {(statusOptions[moduleKey] || []).map((item) => <option value={item} key={item}>{item}</option>)}
            </select>
          </label>
          <button className="btn-secondary admin-icon-button" type="button" onClick={() => load(1)}><Search size={15} />Search</button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name / Title</th>
                <th>Email / Company</th>
                {moduleKey === "rooms" ? <th>Room Owner ID</th> : null}
                <th>Meta</th>
                <th>Status</th>
                <th>Created</th>
                {moduleKey === "jobs" || moduleKey === "notifications" ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={(moduleKey === "jobs" || moduleKey === "notifications" ? 7 : 6) + (moduleKey === "rooms" ? 1 : 0)}><div className="admin-table-state"><span className="loading-spinner" />Loading records...</div></td></tr>
              ) : null}
              {!loading && items.map((item) => (
                <tr key={item._id} className={selected?._id === item._id ? "active" : ""} onClick={() => openDetails(item)}>
                  <td>{item.immutableId || item.postId || item.roomId || item._id?.slice(-8)}</td>
                  <td>{pickName(item, moduleKey)}</td>
                  <td>{pickEmail(item, moduleKey)}</td>
                  {moduleKey === "rooms" ? <td>{item.ownerPublicId || item.immutableOwnerId || item.owner?.immutableId || item.owner?._id || "-"}</td> : null}
                  <td>{pickMeta(item, moduleKey)}</td>
                  <td><StatusPill status={item.status} /></td>
                  <td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}</td>
                  {moduleKey === "jobs" ? (
                    <td>
                      {item.status === "live" || item.status === "rejected" ? (
                        <button className="btn-danger admin-row-delete" type="button" disabled={deleting} onClick={(event) => { event.stopPropagation(); deleteJob(item); }}>
                          {deleting ? "Deleting..." : "Delete"}
                        </button>
                      ) : <span className="section-desc">-</span>}
                    </td>
                  ) : null}
                  {moduleKey === "notifications" ? (
                    <td>
                      <button className="btn-danger admin-row-delete" type="button" disabled={deleting} onClick={(event) => { event.stopPropagation(); deleteNotification(item); }}>
                        {deleting ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
              {!items.length && !loading ? <tr><td colSpan={(moduleKey === "jobs" || moduleKey === "notifications" ? 7 : 6) + (moduleKey === "rooms" ? 1 : 0)}><div className="admin-table-state"><strong>No records found</strong><span>Try a different status filter or search keyword.</span></div></td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="admin-pagination">
          <button className="btn-secondary" type="button" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>Prev</button>
          <span>Page {pagination.page} of {pagination.pages} - {pagination.total} records</span>
          <button className="btn-secondary" type="button" disabled={pagination.page >= pagination.pages} onClick={() => load(pagination.page + 1)}>Next</button>
        </div>
      </section>
      <DetailPanel moduleKey={moduleKey} detail={selected} activity={activity} onClose={() => setSelected(null)} onStatus={updateStatus} statusLoading={updatingStatus} onDelete={() => deleteJob()} onDeleteAccount={() => deleteAccount()} onDeleteNotification={() => deleteNotification()} deleteLoading={deleting} />
    </div>
  );
}

function StatusPill({ status }) {
  const color = status === "verified" || status === "live" || status === "resolved" || status === "sent"
    ? ["var(--green-pale)", "var(--green)"]
    : status === "rejected" || status === "suspended" || status === "failed"
      ? ["#fff1f2", "#991b1b"]
      : ["var(--gold-pale)", "#92400E"];
  return <span className="status-pill" style={{ background: color[0], color: color[1] }}>{status || "pending"}</span>;
}
