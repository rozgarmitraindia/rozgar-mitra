import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext.jsx";
import { fetchSavedJobs, removeSavedJob } from "./candidateApi.js";

export default function SavedJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const toast = useToast();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const saved = await fetchSavedJobs();
        setJobs(saved);
      } catch (err) {
        setError(err.message || "Unable to load saved jobs.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleRemove(jobId) {
    try {
      await removeSavedJob(jobId);
      setJobs((current) => current.filter((job) => String(job._id || job.id) !== String(jobId)));
      toast.show("Removed from saved jobs", "success");
    } catch (err) {
      toast.show(err.message || "Unable to remove saved job.", "error");
    }
  }

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Saved Jobs</div>
          <h1 className="section-title">Your Saved Jobs</h1>
          <p className="section-desc">These are jobs you marked while browsing. Apply or remove anytime.</p>
        </div>
      </div>

      {error ? <div className="login-error">{error}</div> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Company</th>
              <th>Location</th>
              <th>Salary</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5">Loading saved jobs...</td></tr>
            ) : jobs.length ? jobs.map((job) => (
              <tr key={job._id || job.id}>
                <td>{job.title}</td>
                <td>{job.companyName || job.company}</td>
                <td>{job.address || job.location}</td>
                <td>{job.salary || "—"}</td>
                <td>
                  <Link className="btn-secondary" to={`/jobs/${job._id || job.id}`}>View</Link>
                  <button className="btn-search" type="button" onClick={() => handleRemove(job._id || job.id)}>Remove</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5">No saved jobs yet. Browse jobs to save your favorites.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
