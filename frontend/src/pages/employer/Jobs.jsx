import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext.jsx";
import { fetchEmployerJobs, updateEmployerJobApplicationWindow } from "./employerApi.js";

const emptyEdit = {
  applicationStartDate: "",
  applicationEndDate: "",
  interviewStartDate: "",
  interviewEndDate: "",
  interviewStartTime: "",
  interviewEndTime: "",
};

function dateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export default function EmployerJobs() {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setJobs(await fetchEmployerJobs());
    } catch (err) {
      setError(err.message || "Unable to load jobs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => status === "all" ? jobs : jobs.filter((job) => job.status === status), [jobs, status]);

  function openEdit(job) {
    setEditing(job);
    setEditForm({
      applicationStartDate: dateInput(job.applicationStartDate),
      applicationEndDate: dateInput(job.applicationEndDate),
      interviewStartDate: dateInput(job.interviewStartDate),
      interviewEndDate: dateInput(job.interviewEndDate),
      interviewStartTime: job.interviewStartTime || "",
      interviewEndTime: job.interviewEndTime || "",
    });
  }

  async function submitEdit(event) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const result = await updateEmployerJobApplicationWindow(editing._id, editForm);
      const next = result.data?.job || result.job;
      setJobs((items) => items.map((job) => job._id === editing._id ? { ...job, ...next } : job));
      toast.show(result.message || "Job dates updated", "success");
      setEditing(null);
    } catch (err) {
      toast.show(err.message || "Unable to update job dates", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Hiring portal</div>
          <h1 className="section-title">My job postings</h1>
          <p className="section-desc">Track pending, live and rejected jobs. Update registration dates to reopen a post.</p>
        </div>
        <Link className="btn-search" to="/post-job">Post New Job</Link>
      </div>

      {error ? <div className="login-error">{error}</div> : null}

      <div className="filter-tabs">
        {["all", "pending", "live", "rejected"].map((item) => (
          <button key={item} className={`filter-tab ${status === item ? "active" : ""}`} type="button" onClick={() => setStatus(item)}>
            {item === "all" ? "All posts" : item}
          </button>
        ))}
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Application Window</th>
              <th>Interview Window</th>
              <th>Salary</th>
              <th>Vacancies</th>
              <th>Applicants</th>
              <th>Review / action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan="8">Loading jobs...</td></tr> : null}
            {!loading && filtered.length ? filtered.map((job) => (
              <tr key={job._id}>
                <td><b>{job.title || "Untitled"}</b><br /><small>{job.address || "-"}</small></td>
                <td><span className="status-pill">{job.status || "pending"}</span></td>
                <td>{job.applicationStartDate ? new Date(job.applicationStartDate).toLocaleDateString() : "-"}<br /><small>to {job.applicationEndDate ? new Date(job.applicationEndDate).toLocaleDateString() : "-"}</small></td>
                <td>{job.interviewStartDate ? new Date(job.interviewStartDate).toLocaleDateString() : "-"}<br /><small>to {job.interviewEndDate ? new Date(job.interviewEndDate).toLocaleDateString() : "-"} · {job.interviewStartTime || "-"}-{job.interviewEndTime || "-"}</small></td>
                <td>{job.salary || "Not set"}</td>
                <td>{job.vacancies || 1}</td>
                <td>{job.applicationStats?.count || 0}<small>{job.applicationStats?.interviews ? ` · ${job.applicationStats.interviews} interviews` : ""}</small></td>
                <td>
                  <div className="employer-actions">
                    {job.status === "rejected" ? <span className="login-error" style={{ padding: "6px 8px", margin: 0 }}>{job.adminReason || "Rejected"}</span> : null}
                    {job.status === "pending" ? <span className="section-desc">Pending admin review</span> : null}
                    {job.status === "live" ? <Link className="btn-secondary" to="/employer/applications">Manage applicants</Link> : null}
                    <button className="btn-search" type="button" onClick={() => openEdit(job)}>Edit dates</button>
                  </div>
                </td>
              </tr>
            )) : null}
            {!loading && !filtered.length ? <tr><td colSpan="8">No job posts in this status.</td></tr> : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="document-modal" onMouseDown={() => setEditing(null)}>
          <form className="document-modal-card employer-modal" onSubmit={submitEdit} onMouseDown={(event) => event.stopPropagation()}>
            <div className="document-modal-head">
              <div>
                <div className="section-label">Edit registration dates</div>
                <strong>{editing.title || "Job post"}</strong>
              </div>
              <button className="btn-secondary" type="button" onClick={() => setEditing(null)}>Close</button>
            </div>
            <div className="interview-form">
              <p className="section-desc">Rejected posts will be resubmitted for admin review after date update. Live posts can be reopened by extending the closing date.</p>
              <div className="form-row">
                <Field label="Application start" type="date" value={editForm.applicationStartDate} onChange={(value) => setEditForm((current) => ({ ...current, applicationStartDate: value }))} required />
                <Field label="Application end" type="date" value={editForm.applicationEndDate} onChange={(value) => setEditForm((current) => ({ ...current, applicationEndDate: value }))} required />
              </div>
              <div className="form-row">
                <Field label="Interview start" type="date" value={editForm.interviewStartDate} onChange={(value) => setEditForm((current) => ({ ...current, interviewStartDate: value }))} />
                <Field label="Interview end" type="date" value={editForm.interviewEndDate} onChange={(value) => setEditForm((current) => ({ ...current, interviewEndDate: value }))} />
              </div>
              <div className="form-row">
                <Field label="Interview start time" type="time" value={editForm.interviewStartTime} onChange={(value) => setEditForm((current) => ({ ...current, interviewStartTime: value }))} />
                <Field label="Interview end time" type="time" value={editForm.interviewEndTime} onChange={(value) => setEditForm((current) => ({ ...current, interviewEndTime: value }))} />
              </div>
              <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save dates"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function Field({ label, value, onChange, ...props }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-input" value={value} onChange={(event) => onChange(event.target.value)} {...props} />
    </div>
  );
}
