import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSession } from "../../utils/auth.js";
import { fetchEmployerSummary } from "./employerApi.js";

export default function EmployerDashboard() {
  const session = getSession();
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchEmployerSummary();
        setSummary(data);
      } catch (err) {
        console.error(err);
        setError(err.message || "Unable to load dashboard summary.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const stats = useMemo(
    () => ({
      pendingJobs: summary.statusCounts?.pending || 0,
      liveJobs: summary.statusCounts?.live || 0,
      rejectedJobs: summary.statusCounts?.rejected || 0,
      totalApplications: summary.applicationCounts?.total || 0,
      shortlisted: summary.applicationCounts?.shortlisted || 0,
      interviews: summary.applicationCounts?.interview || 0,
      hired: summary.applicationCounts?.hired || 0,
    }),
    [summary]
  );

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Employer Dashboard</div>
          <h1 className="section-title">Welcome back, {session?.companyName || session?.name || "Employer"}</h1>
          <p className="section-desc">Your job postings, applications and hiring summary in one place.</p>
        </div>
      </div>

      {error ? <div className="login-error">{error}</div> : null}

      <div className="dashboard-grid">
        {[
          { label: "Live Jobs", value: stats.liveJobs, link: "/employer/jobs" },
          { label: "Pending Review", value: stats.pendingJobs, link: "/employer/jobs" },
          { label: "Rejected Jobs", value: stats.rejectedJobs, link: "/employer/jobs" },
          { label: "Applications", value: stats.totalApplications, link: "/employer/applications" },
          { label: "Interviews", value: stats.interviews, link: "/employer/applications" },
          { label: "Hired", value: stats.hired, link: "/employer/applications" },
        ].map((card) => (
          <Link key={card.label} to={card.link} className="dashboard-card dashboard-card-small">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </Link>
        ))}
      </div>

      <div className="dashboard-grid dashboard-main-grid">
        <div className="form-card">
          <div className="section-label">Getting Started</div>
          <p className="section-desc">Post jobs, review applications, and schedule interviews directly from your employer account.</p>
          <div className="quick-actions">
            <Link className="btn-search" to="/post-job">Post New Job</Link>
            <Link className="btn-secondary" to="/employer/jobs">Manage Jobs</Link>
            <Link className="btn-secondary" to="/employer/applications">View Applications</Link>
          </div>
        </div>

        <div className="form-card">
          <div className="section-label">Recent Activity</div>
          {loading ? (
            <p className="section-desc">Loading activity…</p>
          ) : (
            <div className="section-desc">Access your latest application counts and job status above.</div>
          )}
        </div>
      </div>
    </section>
  );
}
