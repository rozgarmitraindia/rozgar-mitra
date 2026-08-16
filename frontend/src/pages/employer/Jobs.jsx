import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext.jsx";
import { closeEmployerJob, deleteEmployerJob, fetchEmployerJobs, updateEmployerJobApplicationWindow } from "./employerApi.js";

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
  const [actionJobId, setActionJobId] = useState(null);

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

  async function closeJob(job) {
    if (!window.confirm(`Close "${job.title || "this job"}"? It will be removed from public jobs and no new candidate can apply.`)) return;
    setActionJobId(job._id);
    try {
      const result = await closeEmployerJob(job._id, "Position closed by company");
      const updated = result.data?.job || result.job;
      setJobs((items) => items.map((item) => item._id === job._id ? { ...item, ...updated } : item));
      toast.show(result.message || "Job closed", "success");
    } catch (err) { toast.show(err.message || "Unable to close job", "error"); }
    finally { setActionJobId(null); }
  }

  async function deleteJob(job) {
    if (!window.confirm(`Permanently delete "${job.title || "this job"}"? Its applications will also be removed. This cannot be undone.`)) return;
    setActionJobId(job._id);
    try {
      const result = await deleteEmployerJob(job._id);
      setJobs((items) => items.filter((item) => item._id !== job._id));
      toast.show(result.message || "Job deleted", "success");
    } catch (err) { toast.show(err.message || "Unable to delete job", "error"); }
    finally { setActionJobId(null); }
  }

  function renderActions(job) {
    return (
      <div className="employer-actions">
        {job.status === "rejected" ? <span className="login-error employer-job-reason">{job.adminReason || "Rejected"}</span> : null}
        {job.status === "pending" ? <span className="section-desc employer-job-note">Pending admin review</span> : null}
        {job.status === "live" ? <Link className="btn-secondary" to="/employer/applications">Manage applicants</Link> : null}
        <button className="btn-search" type="button" onClick={() => openEdit(job)}>Edit dates</button>
        {job.status !== "closed" ? <button className="btn-secondary" type="button" disabled={actionJobId === job._id} onClick={() => closeJob(job)}>Close Job</button> : <span className="section-desc employer-job-note">Closed {job.closedAt ? new Date(job.closedAt).toLocaleDateString() : ""}</span>}
        <button className="btn-danger" type="button" disabled={actionJobId === job._id} onClick={() => deleteJob(job)}>{actionJobId === job._id ? "Please wait..." : "Delete Job"}</button>
      </div>
    );
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
        {["all", "pending", "live", "closed", "rejected"].map((item) => (
          <button key={item} className={`filter-tab ${status === item ? "active" : ""}`} type="button" onClick={() => setStatus(item)}>
            {item === "all" ? "All posts" : item}
          </button>
        ))}
      </div>

      <div className="employer-job-cards">
        {loading ? <div className="employer-job-card">Loading jobs...</div> : null}
        {!loading && filtered.length ? filtered.map((job) => (
          <article className="employer-job-card" key={job._id}>
            <div className="employer-job-card-head">
              <div>
                <h2>{job.title || "Untitled"}</h2>
                <p>{job.address || "-"}</p>
              </div>
              <span className="status-pill">{job.status || "pending"}</span>
            </div>
            <div className="employer-job-meta">
              <Info label="Application" value={job.applicationStartDate ? new Date(job.applicationStartDate).toLocaleDateString() : "-"} sub={`to ${job.applicationEndDate ? new Date(job.applicationEndDate).toLocaleDateString() : "-"}`} />
              <Info label="Interview" value={job.interviewStartDate ? new Date(job.interviewStartDate).toLocaleDateString() : "-"} sub={`to ${job.interviewEndDate ? new Date(job.interviewEndDate).toLocaleDateString() : "-"} | ${job.interviewStartTime || "-"}-${job.interviewEndTime || "-"}`} />
              <Info label="Salary" value={job.salary || "Not set"} />
              <Info label="Vacancies" value={job.vacancies || 1} />
              <Info label="Applicants" value={job.applicationStats?.count || 0} sub={job.applicationStats?.interviews ? `${job.applicationStats.interviews} interviews` : ""} />
            </div>
            {renderActions(job)}
          </article>
        )) : null}
        {!loading && !filtered.length ? <div className="employer-job-card">No job posts in this status.</div> : null}
      </div>

      <div className="admin-table-wrap employer-jobs-table">
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
                <td>{renderActions(job)}</td>
              </tr>
            )) : null}
            {!loading && !filtered.length ? <tr><td colSpan="8">No job posts in this status.</td></tr> : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="document-modal employer-date-modal-overlay" onMouseDown={() => setEditing(null)}>
          <form className="document-modal-card employer-modal employer-date-modal" onSubmit={submitEdit} onMouseDown={(event) => event.stopPropagation()}>
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
              <div className="employer-date-modal-actions">
                <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save dates"}</button>
              </div>
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

function Info({ label, value, sub = "" }) {
  return (
    <div className="employer-job-info">
      <span>{label}</span>
      <strong>{value}</strong>
      {sub ? <small>{sub}</small> : null}
    </div>
  );
}
