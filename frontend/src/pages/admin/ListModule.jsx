import { useEffect, useState } from "react";
import { adminFetch, moduleTitles, modules, pickName, pickEmail, pickMeta, statusOptions } from "./adminApi.js";
import DetailPanel from "./DetailPanel.jsx";

export default function ListModule({ moduleKey }) {
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
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
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
    const reason = needsReason ? window.prompt("Reason required") : "";
    if (needsReason && !reason) return;
    try {
      const result = await adminFetch(`/admin/${moduleKey}/${selected._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus, reason }),
      });
      const data = result.data || result;
      setSelected(data.item);
      await load(pagination.page);
      await openDetails(data.item);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load(pagination.page);
  }, [moduleKey, status]);

  return (
    <div className="admin-content-grid">
      <section className="form-card">
        <div className="admin-list-head">
          <div>
            <div className="section-label">{moduleTitles[moduleKey]}</div>
            <h1 className="form-title">{moduleTitles[moduleKey]}</h1>
          </div>
          <button className="btn-search" type="button" onClick={() => load(1)}>Refresh</button>
        </div>
        {error ? <div className="login-error">{error}</div> : null}
        <div className="admin-toolbar">
          <input
            className="form-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && load(1)}
            placeholder="Search by name, email, ID, title..."
          />
          <select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All Status</option>
            {(statusOptions[moduleKey] || []).map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
          <button className="btn-secondary" type="button" onClick={() => load(1)}>Search</button>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name / Title</th>
                <th>Email / Company</th>
                <th>Meta</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id} onClick={() => openDetails(item)}>
                  <td>{item.immutableId || item.postId || item.roomId || item._id?.slice(-8)}</td>
                  <td>{pickName(item, moduleKey)}</td>
                  <td>{pickEmail(item, moduleKey)}</td>
                  <td>{pickMeta(item, moduleKey)}</td>
                  <td><StatusPill status={item.status} /></td>
                  <td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}</td>
                </tr>
              ))}
              {!items.length && !loading ? (
                <tr><td colSpan="6">No records found.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="admin-pagination">
          <button className="btn-secondary" type="button" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)}>Prev</button>
          <span>Page {pagination.page} of {pagination.pages} - {pagination.total} records</span>
          <button className="btn-secondary" type="button" disabled={pagination.page >= pagination.pages} onClick={() => load(pagination.page + 1)}>Next</button>
        </div>
      </section>
      <DetailPanel moduleKey={moduleKey} detail={selected} activity={activity} onClose={() => setSelected(null)} onStatus={updateStatus} />
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
