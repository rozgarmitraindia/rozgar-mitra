import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSession } from "../../utils/auth.js";
import { fetchCandidateApplications, fetchCandidateSummary } from "./candidateApi.js";

export default function Dashboard() {
  const session = getSession();
  const [summary, setSummary] = useState({});
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [summaryData, apps] = await Promise.all([fetchCandidateSummary(), fetchCandidateApplications()]);
        setSummary(summaryData);
        setApplications(apps);
      } catch (err) {
        console.error(err);
        setError(err.message || "Unable to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const stats = useMemo(
    () => ({
      savedJobs: summary.savedJobs || 0,
      savedRooms: summary.savedRooms || 0,
      applied: summary.applications || 0,
      interviews: summary.interviews || 0,
      notifications: summary.unreadNotifications || 0,
    }),
    [summary]
  );

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Candidate Dashboard</div>
          <h1 className="section-title">Welcome back, {session?.name || "Candidate"}</h1>
          <p className="section-desc">Your profile, jobs and application activity in one place.</p>
        </div>
      </div>

      {error ? <div className="login-error">{error}</div> : null}

      <div className="dashboard-grid">
        {[
          { label: "Saved Jobs", value: stats.savedJobs, link: "/saved-jobs" },
          { label: "Saved Rooms", value: stats.savedRooms, link: "/rooms" },
          { label: "Applied Jobs", value: stats.applied, link: "/applied-jobs" },
          { label: "Interviews", value: stats.interviews, link: "/interviews" },
          { label: "Unread Alerts", value: stats.notifications, link: "/notifications" },
        ].map((card) => (
          <Link key={card.label} to={card.link} className="dashboard-card dashboard-card-small">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </Link>
        ))}
      </div>

      <div className="dashboard-grid dashboard-main-grid">
        <div className="form-card">
          <div className="section-label">Recent Applications</div>
          {loading ? (
            <p className="section-desc">Loading your activity…</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Status</th>
                    <th>Employer</th>
                    <th>Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.slice(0, 6).map((application) => (
                    <tr key={application._id}>
                      <td>{application.job?.title || "Unknown"}</td>
                      <td>{application.status}</td>
                      <td>{application.employer?.companyName || application.employer?.fullName || "-"}</td>
                      <td>{application.createdAt ? new Date(application.createdAt).toLocaleDateString() : "-"}</td>
                    </tr>
                  ))}
                  {!applications.length && !loading && (
                    <tr><td colSpan="4">No applications yet. Apply to jobs from the browse page.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="form-card">
          <div className="section-label">Quick Actions</div>
          <div className="quick-actions">
            <Link className="btn-search" to="/saved-jobs">Saved Jobs</Link>
            <Link className="btn-secondary" to="/applied-jobs">My Applications</Link>
            <Link className="btn-search" to="/notifications">Notifications</Link>
            <Link className="btn-secondary" to="/profile">Profile</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
