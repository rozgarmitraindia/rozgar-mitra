import { useEffect, useState } from "react";
import { adminFetch } from "./adminApi.js";

export default function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch("/admin/dashboard/analytics")
      .then((result) => setData(result.data || result))
      .catch((err) => setError(err.message));
  }, []);

  const totals = data?.totals || {};
  const growth = data?.growth || [];
  const recentActivity = data?.recentActivity || [];
  const maxGrowth = Math.max(1, ...growth.map((item) => item.users + item.jobs + item.rooms + item.applications));
  const definiteTotal = totals.jobs + totals.rooms || 0;
  const donutPercent = definiteTotal ? Math.min(100, Math.round((totals.jobs / definiteTotal) * 100)) : 0;

  const overviewCards = [
    { title: "Project Dashboard", subtitle: "New Task Assign", note: "4 hrs ago", badge: "Active" },
    { title: "Admin Template", subtitle: "New Task Assign", note: "3 hrs ago", badge: "Review" },
    { title: "Client Project", subtitle: "New Task Assign", note: "5 hrs ago", badge: "Live" },
    { title: "Figma Design", subtitle: "New Task Assign", note: "1 Day ago", badge: "Draft" },
  ];

  const summaryCards = [
    { title: "Live Jobs", value: totals.jobs ?? 0 },
    { title: "Employers", value: totals.employers ?? 0 },
    { title: "Room Owners", value: totals.roomOwners ?? 0 },
    { title: "Pending Jobs", value: data?.statusSummary?.pendingJobs ?? 0 },
  ];

  return (
    <section className="form-card dashboard-page">
      <div className="dashboard-head">
        <div>
          <div className="section-label">Dashboard</div>
          <h1 className="form-title">Admin Control Center</h1>
          <p className="section-desc">Manage the website, review requests, and resolve issues from one administrator workspace.</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn-search" type="button" onClick={() => onNavigate?.("jobs")}>Review Jobs</button>
          <button className="btn-secondary" type="button" onClick={() => onNavigate?.("rooms")}>Review Rooms</button>
        </div>
      </div>

      {error ? <div className="login-error">{error}</div> : null}

      <div className="dashboard-grid dashboard-grid-overview">
        {overviewCards.map((card) => (
          <div key={card.title} className="dashboard-card dashboard-card-small">
            <div className="dashboard-card-top">
              <span>{card.title}</span>
              <span className="dashboard-card-dot">•••</span>
            </div>
            <p className="dashboard-card-subtitle">{card.subtitle}</p>
            <div className="dashboard-card-bottom">
              <span>{card.note}</span>
              <span className="dashboard-badge">{card.badge}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid dashboard-quick-grid">
        {[
          { label: "Pending Jobs", value: data?.statusSummary?.pendingJobs ?? 0, action: "jobs" },
          { label: "Pending Rooms", value: data?.statusSummary?.pendingRooms ?? 0, action: "rooms" },
          { label: "Open Complaints", value: totals.complaints ?? 0, action: "complaints" },
          { label: "Pending Users", value: data?.statusSummary?.pendingUsers ?? 0, action: "candidates" },
        ].map((item) => (
          <div key={item.label} className="dashboard-card dashboard-card-quick" onClick={() => onNavigate?.(item.action)}>
            <div className="dashboard-card-top">
              <span>{item.label}</span>
              <span className="dashboard-card-dot">›</span>
            </div>
            <div className="dashboard-summary-value">{item.value}</div>
            <p className="dashboard-card-subtitle">Tap to review</p>
          </div>
        ))}
      </div>

      <div className="dashboard-grid dashboard-main-grid">
        <div className="dashboard-card dashboard-card-medium">
          <div className="dashboard-card-top">
            <span>Monthly Activity</span>
            <span className="dashboard-card-dot">•••</span>
          </div>
          <div className="dashboard-donut-panel">
            <div className="donut-chart" style={{ background: `conic-gradient(var(--green) 0 ${donutPercent}%, var(--gray-100) ${donutPercent}% 100%)` }}>
              <span>{donutPercent}%</span>
            </div>
            <div className="donut-meta">
              <div><span className="legend-dot green"></span>Live Jobs</div>
              <div><span className="legend-dot blue"></span>Pending Approvals</div>
            </div>
          </div>
        </div>

        <div className="dashboard-card dashboard-card-medium">
          <div className="dashboard-card-top">
            <span>Platform Growth</span>
            <span className="dashboard-card-dot">•••</span>
          </div>
          <div className="dashboard-chart-bar">
            {growth.map((item) => {
              const total = item.users + item.jobs + item.rooms + item.applications;
              return (
                <div key={item.month} className="chart-bar-item">
                  <div className="chart-bar-fill" style={{ height: `${Math.max(16, (total / maxGrowth) * 180)}px` }} />
                  <span>{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="dashboard-grid dashboard-summary-grid">
        {summaryCards.map((card) => (
          <div key={card.title} className="dashboard-card dashboard-card-small dashboard-card-compact">
            <span className="dashboard-card-label">{card.title}</span>
            <p className="dashboard-summary-value">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="dashboard-activity-panel dashboard-card">
        <div className="dashboard-card-top">
          <span>Recent Activity</span>
          <span className="dashboard-card-dot">•••</span>
        </div>
        <div className="admin-activity">
          {recentActivity.map((item) => (
            <div key={item._id} className="detail-desc">
              <b>{item.action}</b> - {item.module}
              <br />
              <span>{item.reason || item.actor?.email || new Date(item.createdAt).toLocaleString()}</span>
            </div>
          ))}
          {!recentActivity.length && <div className="detail-desc">No recent activity available.</div>}
        </div>
      </div>
    </section>
  );
}
