import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../contexts/ToastContext.jsx";
import { fetchEmployerApplications, hireApplicant, interviewApplicant, rejectApplicant, shortlistApplicant } from "./employerApi.js";

const statuses = ["all", "submitted", "shortlisted", "interview", "hired", "rejected"];
const emptyInterview = { mode: "remote", date: "", time: "", meetingUrl: "", mapLink: "", locationAddress: "", supportContact: "" };

function candidateAge(dateOfBirth) {
  if (!dateOfBirth) return "-";
  const date = new Date(dateOfBirth);
  let age = new Date().getFullYear() - date.getFullYear();
  if (new Date().getMonth() < date.getMonth() || (new Date().getMonth() === date.getMonth() && new Date().getDate() < date.getDate())) age -= 1;
  return `${age} years`;
}

export default function EmployerApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [interviewTarget, setInterviewTarget] = useState(null);
  const [interview, setInterview] = useState(emptyInterview);
  const toast = useToast();

  async function load() {
    setLoading(true); setError("");
    try { setApplications(await fetchEmployerApplications()); } catch (err) { setError(err.message || "Unable to load applications."); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => status === "all" ? applications : applications.filter((item) => item.status === status), [applications, status]);
  const updateItem = (next) => setApplications((items) => items.map((item) => item._id === next._id ? next : item));

  async function doAction(item, action) {
    setActionLoading(`${action}:${item._id}`);
    try {
      let result;
      if (action === "shortlist") result = await shortlistApplicant(item._id);
      if (action === "hire") result = await hireApplicant(item._id, {});
      if (action === "reject") {
        const reason = window.prompt("Rejection reason for candidate");
        if (!reason) return;
        result = await rejectApplicant(item._id, { reason });
      }
      const next = result.data?.application || result.application;
      if (next) updateItem(next);
      toast.show(result.message || "Application updated", "success");
    } catch (err) { toast.show(err.message || "Unable to update application", "error"); } finally { setActionLoading(""); }
  }

  async function scheduleInterview(event) {
    event.preventDefault();
    if (!interviewTarget) return;
    setActionLoading(`interview:${interviewTarget._id}`);
    try {
      const result = await interviewApplicant(interviewTarget._id, interview);
      const next = result.data?.application || result.application;
      if (next) updateItem(next);
      toast.show("Interview scheduled. Email and dashboard notification sent.", "success");
      setInterviewTarget(null); setInterview(emptyInterview);
    } catch (err) { toast.show(err.message || "Unable to schedule interview", "error"); } finally { setActionLoading(""); }
  }

  return (
    <section className="section">
      <div className="section-header"><div><div className="section-label">Hiring workspace</div><h1 className="section-title">Applicants & interviews</h1><p className="section-desc">Review candidate biodata, shortlist applicants, schedule interviews and complete hiring.</p></div><button className="btn-secondary" type="button" onClick={load}>Refresh</button></div>
      {error ? <div className="login-error">{error}</div> : null}
      <div className="filter-tabs">{statuses.map((item) => <button key={item} type="button" className={`filter-tab ${status === item ? "active" : ""}`} onClick={() => setStatus(item)}>{item === "all" ? "All applicants" : item}</button>)}</div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Candidate</th><th>Job</th><th>Profile</th><th>Status</th><th>Applied</th><th>Actions</th></tr></thead><tbody>
        {loading ? <tr><td colSpan="6">Loading applicants...</td></tr> : filtered.length ? filtered.map((item) => { const busy = Boolean(actionLoading); const closed = ["hired", "rejected"].includes(item.status); return <tr key={item._id}><td><b>{item.candidate?.fullName || "Candidate"}</b><br /><small>{item.candidate?.email}</small></td><td>{item.job?.title || "Job removed"}</td><td>{candidateAge(item.candidate?.dateOfBirth)} · {item.candidate?.gender || "Not shared"}</td><td><span className="status-pill">{item.status}</span></td><td>{new Date(item.createdAt).toLocaleDateString()}</td><td className="employer-actions"><button className="btn-secondary" type="button" onClick={() => setSelected(item)}>View bio</button><button className="btn-secondary" disabled={busy || closed} type="button" onClick={() => doAction(item, "shortlist")}>Shortlist</button><button className="btn-search" disabled={busy || closed} type="button" onClick={() => { setInterviewTarget(item); setInterview(item.interview || emptyInterview); }}>Interview</button><button className="btn-search" disabled={busy || closed} type="button" onClick={() => doAction(item, "hire")}>Hire</button><button className="btn-secondary" disabled={busy || closed} type="button" onClick={() => doAction(item, "reject")}>Reject</button></td></tr>; }) : <tr><td colSpan="6">No applications in this status.</td></tr>}
      </tbody></table></div>

      {selected ? <CandidateModal item={selected} onClose={() => setSelected(null)} /> : null}
      {interviewTarget ? <InterviewModal item={interviewTarget} value={interview} onChange={setInterview} onClose={() => setInterviewTarget(null)} onSubmit={scheduleInterview} loading={actionLoading.startsWith("interview:")} /> : null}
    </section>
  );
}

function CandidateModal({ item, onClose }) {
  const candidate = item.candidate || {};
  return <div className="document-modal" onMouseDown={onClose}><div className="document-modal-card employer-modal" onMouseDown={(event) => event.stopPropagation()}><div className="document-modal-head"><div><div className="section-label">Candidate profile</div><strong>{candidate.fullName || "Candidate"}</strong></div><button className="btn-secondary" type="button" onClick={onClose}>Close</button></div><div className="candidate-bio-grid"><Bio label="Email" value={candidate.email} /><Bio label="Mobile" value={candidate.mobile} /><Bio label="Age" value={candidateAge(candidate.dateOfBirth)} /><Bio label="Date of birth" value={candidate.dateOfBirth ? new Date(candidate.dateOfBirth).toLocaleDateString() : "-"} /><Bio label="Gender" value={candidate.gender} /><Bio label="Address" value={candidate.address} /><Bio label="Pincode" value={candidate.pincode} /><Bio label="Experience" value={candidate.experience} /><Bio label="Availability" value={candidate.availability} /><Bio label="Skills" value={(candidate.skills || []).join(", ")} /><Bio label="About" value={candidate.about} /></div>{candidate.resume?.url ? <a className="btn-search" href={candidate.resume.url} target="_blank" rel="noreferrer">Open resume</a> : null}</div></div>;
}
function Bio({ label, value }) { return <div><small>{label}</small><p>{value || "-"}</p></div>; }

function InterviewModal({ item, value, onChange, onClose, onSubmit, loading }) {
  const set = (key, next) => onChange((current) => ({ ...current, [key]: next }));
  const remote = value.mode === "remote";
  return <div className="document-modal" onMouseDown={onClose}><form className="document-modal-card employer-modal" onSubmit={onSubmit} onMouseDown={(event) => event.stopPropagation()}><div className="document-modal-head"><div><div className="section-label">Interview schedule</div><strong>{item.candidate?.fullName} · {item.job?.title}</strong></div><button className="btn-secondary" type="button" onClick={onClose}>Close</button></div><div className="interview-form"><div className="form-row"><div className="form-group"><label className="form-label">Mode *</label><select className="form-select" value={value.mode} onChange={(e) => set("mode", e.target.value)}><option value="remote">Remote</option><option value="physical">Physical / in-person</option></select></div><div className="form-group"><label className="form-label">Support contact *</label><input className="form-input" value={value.supportContact} onChange={(e) => set("supportContact", e.target.value)} required /></div></div><div className="form-row"><div className="form-group"><label className="form-label">Date *</label><input className="form-input" type="date" value={value.date} onChange={(e) => set("date", e.target.value)} required /></div><div className="form-group"><label className="form-label">Time *</label><input className="form-input" type="time" value={value.time} onChange={(e) => set("time", e.target.value)} required /></div></div>{remote ? <div className="form-group"><label className="form-label">Meeting link *</label><input className="form-input" type="url" value={value.meetingUrl} onChange={(e) => set("meetingUrl", e.target.value)} placeholder="https://meet.google.com/..." required /></div> : <><div className="form-group"><label className="form-label">Interview location *</label><textarea className="form-textarea" value={value.locationAddress} onChange={(e) => set("locationAddress", e.target.value)} required /></div><div className="form-group"><label className="form-label">Google Maps URL <small>(optional)</small></label><input className="form-input" type="url" value={value.mapLink} onChange={(e) => set("mapLink", e.target.value)} /></div></>}<button className="btn-primary" type="submit" disabled={loading}>{loading ? "Scheduling..." : "Schedule & notify candidate"}</button></div></form></div>;
}
