import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext.jsx";
import { fetchCandidateApplications } from "./candidateApi.js";

export default function AppliedJobs() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const toast = useToast();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const items = await fetchCandidateApplications();
        setApplications(items);
      } catch (err) {
        setError(err.message || "Unable to load applications.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Applied Jobs</div>
          <h1 className="section-title">Your Applications</h1>
          <p className="section-desc">Review the status of jobs you have applied to.</p>
        </div>
      </div>

      {error ? <div className="login-error">{error}</div> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Status</th>
              <th>Employer</th>
              <th>Applied Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5">Loading applications...</td></tr>
            ) : applications.length ? applications.map((item) => (
              <tr key={item._id}>
                <td>{item.job?.title || "Unknown"}</td>
                <td>{item.status}</td>
                <td>{item.employer?.companyName || item.employer?.fullName || "-"}</td>
                <td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}</td>
                <td>
                  {item.job?._id ? <Link className="btn-secondary" to={`/jobs/${item.job._id}`}>View Job</Link> : "-"}
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5">You haven't applied to any jobs yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
