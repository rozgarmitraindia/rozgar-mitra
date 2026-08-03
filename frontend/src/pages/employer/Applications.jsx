import { useEffect, useState } from "react";
import { useToast } from "../../contexts/ToastContext.jsx";
import {
  fetchEmployerApplications,
  interviewApplicant,
  hireApplicant,
  rejectApplicant,
} from "./employerApi.js";

export default function EmployerApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const toast = useToast();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const items = await fetchEmployerApplications();
        setApplications(items);
      } catch (err) {
        console.error(err);
        setError(err.message || "Unable to load applications.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleAction(applicationId, action) {
    setActionLoading(applicationId);
    try {
      const payload = { message: action === "reject" ? "Not selected" : "Interview scheduled" };
      let response;
      if (action === "interview") response = await interviewApplicant(applicationId, payload);
      else if (action === "hire") response = await hireApplicant(applicationId, payload);
      else if (action === "reject") response = await rejectApplicant(applicationId, payload);
      setApplications((items) => items.map((item) => (
        item._id === applicationId ? { ...item, status: action === "interview" ? "interview" : action === "hire" ? "hired" : "rejected" } : item
      )));
      toast.show(response.message || "Application updated.", "success");
    } catch (err) {
      toast.show(err.message || "Unable to update application.", "error");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Applications</div>
          <h1 className="section-title">Candidate Requests</h1>
          <p className="section-desc">Manage incoming applications, schedule interviews, and hire candidates.</p>
        </div>
      </div>

      {error ? <div className="login-error">{error}</div> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Job</th>
              <th>Status</th>
              <th>Applied</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5">Loading applications…</td></tr>
            ) : applications.length ? applications.map((item) => (
              <tr key={item._id}>
                <td>{item.candidate?.fullName || item.candidate?.email || "Candidate"}</td>
                <td>{item.job?.title || "Job removed"}</td>
                <td>{item.status || "pending"}</td>
                <td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}</td>
                <td>
                  <button className="btn-secondary" type="button" disabled={actionLoading === item._id || item.status === "interview" || item.status === "hired"} onClick={() => handleAction(item._id, "interview")}>Interview</button>
                  <button className="btn-search" type="button" disabled={actionLoading === item._id || item.status === "hired"} onClick={() => handleAction(item._id, "hire")}>Hire</button>
                  <button className="btn-secondary" type="button" disabled={actionLoading === item._id || item.status === "rejected"} onClick={() => handleAction(item._id, "reject")}>Reject</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5">No job applications yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
