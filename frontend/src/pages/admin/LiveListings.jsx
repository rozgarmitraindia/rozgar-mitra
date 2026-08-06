import { useEffect, useMemo, useState } from "react";
import { Briefcase, Edit3, Home, RefreshCw, Trash2, XCircle } from "lucide-react";
import { adminFetch } from "./adminApi.js";
import { useToast } from "../../contexts/ToastContext.jsx";

const tabs = [
  { key: "jobs", label: "Live Jobs", icon: Briefcase },
  { key: "rooms", label: "Live Rooms", icon: Home },
];

const jobFields = [
  ["title", "Title"],
  ["role", "Role"],
  ["salary", "Salary"],
  ["vacancies", "Vacancies", "number"],
  ["address", "Address"],
  ["contactNumber", "Contact"],
  ["applicationEndDate", "Application deadline", "date"],
  ["description", "Description", "textarea"],
  ["requirements", "Requirements", "textarea"],
];

const roomFields = [
  ["title", "Title"],
  ["propertyName", "Property"],
  ["rent", "Rent"],
  ["deposit", "Deposit"],
  ["roomType", "Room type"],
  ["address", "Address"],
  ["contactNumber", "Contact"],
  ["description", "Description", "textarea"],
];

function ownerIdFor(item, type) {
  if (type === "jobs") return item.employerPublicId || item.immutableEmployerId || item.employer?.immutableId || item.employer?._id || "-";
  return item.ownerPublicId || item.immutableOwnerId || item.owner?.immutableId || item.owner?._id || "-";
}

export default function LiveListings() {
  const toast = useToast();
  const [active, setActive] = useState("jobs");
  const [items, setItems] = useState({ jobs: [], rooms: [] });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const activeItems = items[active] || [];

  async function load() {
    setLoading(true);
    try {
      const [jobs, rooms] = await Promise.all([
        adminFetch("/admin/jobs?status=live&limit=100"),
        adminFetch("/admin/rooms?status=live&limit=100"),
      ]);
      setItems({
        jobs: jobs.data?.items || jobs.items || [],
        rooms: rooms.data?.items || rooms.items || [],
      });
    } catch (error) {
      toast.show(error.message || "Unable to load live listings", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function rejectItem(item) {
    const reason = window.prompt(`Reject reason required for "${item.title || "this listing"}"`);
    if (!String(reason || "").trim()) return toast.show("Reject reason is compulsory", "error");
    try {
      await adminFetch(`/admin/${active}/${item._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "rejected", reason }),
      });
      toast.show("Listing rejected and removed from public pages", "success");
      load();
    } catch (error) {
      toast.show(error.message || "Reject failed", "error");
    }
  }

  async function deleteItem(item) {
    const reason = window.prompt(`Delete reason required for "${item.title || "this listing"}"`);
    if (!String(reason || "").trim()) return toast.show("Delete reason is compulsory", "error");
    if (!window.confirm("This will permanently delete the listing from database. Continue?")) return;
    try {
      await adminFetch(`/admin/${active}/${item._id}`, {
        method: "DELETE",
        body: JSON.stringify({ reason }),
      });
      toast.show("Listing permanently deleted", "success");
      load();
    } catch (error) {
      toast.show(error.message || "Delete failed", "error");
    }
  }

  async function saveEdit(values) {
    const reason = window.prompt("Edit reason required. This will be sent to the owner/employer.");
    if (!String(reason || "").trim()) return toast.show("Edit reason is compulsory", "error");
    try {
      await adminFetch(`/admin/${editing.type}/${editing.item._id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...values, reason }),
      });
      toast.show("Listing updated and owner notified", "success");
      setEditing(null);
      load();
    } catch (error) {
      toast.show(error.message || "Edit failed", "error");
    }
  }

  return (
    <section className="form-card admin-live-page">
      <div className="admin-list-head">
        <div>
          <div className="section-label">Published Inventory</div>
          <h1 className="form-title">Live Listings</h1>
          <p className="section-desc">Review, edit, reject or permanently delete live jobs and rooms. Reason is compulsory for every admin action.</p>
        </div>
        <button className="btn-search admin-icon-button" type="button" onClick={load} disabled={loading}>
          <RefreshCw size={16} className={loading ? "admin-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="admin-live-tabs">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" className={active === key ? "active" : ""} onClick={() => setActive(key)}>
            <Icon size={17} />
            <span>{label}</span>
            <strong>{items[key]?.length || 0}</strong>
          </button>
        ))}
      </div>

      <div className="admin-live-grid">
        {activeItems.map((item) => (
          <article className="admin-live-card" key={item._id}>
            <div>
              <span className="status-pill">{item.status}</span>
              <h2>{item.title || item.propertyName || "Untitled"}</h2>
              <p>{active === "jobs" ? item.companyName || item.employer?.companyName : item.propertyName || item.owner?.propertyName}</p>
            </div>
            <dl>
              <div><dt>{active === "jobs" ? "Employer ID" : "Room Owner ID"}</dt><dd>{ownerIdFor(item, active)}</dd></div>
              <div><dt>{active === "jobs" ? "Salary" : "Rent"}</dt><dd>{active === "jobs" ? item.salary || "-" : item.rent || "-"}</dd></div>
              <div><dt>Location</dt><dd>{item.address || item.companyLocation || "-"}</dd></div>
              <div><dt>Contact</dt><dd>{item.contactNumber || item.companyPhone || "-"}</dd></div>
              <div><dt>Updated</dt><dd>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "-"}</dd></div>
            </dl>
            <div className="admin-live-actions">
              <button className="btn-search admin-icon-button" type="button" onClick={() => setEditing({ type: active, item })}><Edit3 size={15} />Edit</button>
              <button className="btn-secondary admin-icon-button" type="button" onClick={() => rejectItem(item)}><XCircle size={15} />Reject</button>
              <button className="btn-danger admin-icon-button" type="button" onClick={() => deleteItem(item)}><Trash2 size={15} />Delete</button>
            </div>
          </article>
        ))}
        {!activeItems.length ? (
          <div className="admin-table-state admin-live-empty">
            <strong>No live {active === "jobs" ? "jobs" : "rooms"} found</strong>
            <span>Approved listings will appear here.</span>
          </div>
        ) : null}
      </div>

      {editing ? <EditListingModal data={editing} onClose={() => setEditing(null)} onSave={saveEdit} /> : null}
    </section>
  );
}

function EditListingModal({ data, onClose, onSave }) {
  const fields = data.type === "jobs" ? jobFields : roomFields;
  const initial = useMemo(() => Object.fromEntries(fields.map(([key]) => [key, normalizeValue(data.item[key])])), [data, fields]);
  const [values, setValues] = useState(initial);

  function update(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="document-modal" onMouseDown={onClose}>
      <form className="document-modal-card admin-edit-modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); onSave(values); }}>
        <div className="document-modal-head">
          <div>
            <strong>Edit {data.type === "jobs" ? "Job" : "Room"}</strong>
            <span>{data.item.title || data.item.propertyName}</span>
          </div>
          <button className="document-close" type="button" onClick={onClose}>Close</button>
        </div>
        <div className="admin-edit-grid">
          {fields.map(([key, label, type]) => (
            <label className={type === "textarea" ? "form-group admin-edit-wide" : "form-group"} key={key}>
              <span className="form-label">{label}</span>
              {type === "textarea" ? (
                <textarea className="form-textarea" value={values[key] || ""} onChange={(event) => update(key, event.target.value)} />
              ) : (
                <input className="form-input" type={type || "text"} value={values[key] || ""} onChange={(event) => update(key, event.target.value)} />
              )}
            </label>
          ))}
        </div>
        <button className="btn-search admin-save-edit" type="submit">Save Changes</button>
      </form>
    </div>
  );
}

function normalizeValue(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
  if (Array.isArray(value)) return value.join(", ");
  return value;
}
