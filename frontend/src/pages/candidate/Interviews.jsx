import { useEffect, useState } from "react";
import { fetchCandidateApplications } from "./candidateApi.js";

export default function Interviews() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const items = await fetchCandidateApplications();
        setInterviews(items.filter((item) => item.status === "interview"));
      } catch (err) {
        setError(err.message || "Unable to load interviews.");
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
          <div className="section-label">Interviews</div>
          <h1 className="section-title">Interview Schedule</h1>
          <p className="section-desc">View upcoming and scheduled interviews for your applications.</p>
        </div>
      </div>

      {error ? <div className="login-error">{error}</div> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Employer</th>
              <th>Date</th>
              <th>Time</th>
              <th>Mode / Location</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5">Loading interviews...</td></tr>
            ) : interviews.length ? interviews.map((item) => (
              <tr key={item._id}>
                <td>{item.job?.title || "Unknown"}</td>
                <td>{item.employer?.companyName || item.employer?.fullName || "-"}</td>
                <td>{item.interview?.date || "TBD"}</td>
                <td>{item.interview?.time || "TBD"}</td>
                <td>{item.interview?.mode ? `${item.interview.mode} / ${item.interview.locationAddress || item.interview.mapLink || "-"}` : "TBD"}</td>
              </tr>
            )) : (
              <tr><td colSpan="5">No interview schedule yet. Check your applications for updates.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
