import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext.jsx";
import { fetchEmployerJobs } from "./employerApi.js";

export default function EmployerJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const toast = useToast();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const items = await fetchEmployerJobs();
        setJobs(items);
      } catch (err) {
        console.error(err);
        setError(err.message || "Unable to load jobs.");
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
          <div className="section-label">My Jobs</div>
          <h1 className="section-title">Job Postings</h1>
          <p className="section-desc">Review your posted jobs and track approval status.</p>
        </div>
        <Link className="btn-search" to="/post-job">Post New Job</Link>
      </div>

      {error ? <div className="login-error">{error}</div> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Posted</th>
              <th>Salary</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5">Loading jobs…</td></tr>
            ) : jobs.length ? jobs.map((job) => (
              <tr key={job._id}>
                <td>{job.title || "Untitled"}</td>
                <td>{job.status || "pending"}</td>
                <td>{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "-"}</td>
                <td>{job.salary || "Not set"}</td>
                <td>{job.status === "pending" ? "Pending review" : "Live"}</td>
              </tr>
            )) : (
              <tr><td colSpan="5">You have no job postings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
