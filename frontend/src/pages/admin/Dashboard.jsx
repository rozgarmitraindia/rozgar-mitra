import { useEffect, useState } from "react";
import { BriefcaseBusiness, Building2, Home, Users, ArrowUpRight, Clock3 } from "lucide-react";
import { adminFetch } from "./adminApi.js";

export default function Dashboard({ onNavigate, overview }) {
  const [data, setData] = useState(overview || null);
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
  const liveJobs = data?.statusSummary?.liveJobs ?? 0;
  const liveRooms = data?.statusSummary?.liveRooms ?? 0;
  const liveTotal = liveJobs + liveRooms;
  const donutPercent = liveTotal ? Math.min(100, Math.round((liveJobs / liveTotal) * 100)) : 0;

  const overviewCards = [
    { title: "Candidates", value: totals.users ?? 0, note: "Registered accounts", action: "candidates", icon: Users, tone: "orange" },
    { title: "Employers", value: totals.employers ?? 0, note: "Business accounts", action: "employers", icon: Building2, tone: "blue" },
    { title: "Jobs", value: totals.jobs ?? 0, note: `${data?.statusSummary?.pendingJobs ?? 0} awaiting review`, action: "jobs", icon: BriefcaseBusiness, tone: "green" },
    { title: "Rooms", value: totals.rooms ?? 0, note: `${data?.statusSummary?.pendingRooms ?? 0} awaiting review`, action: "rooms", icon: Home, tone: "purple" },
  ];

  const summaryCards = [
    { title: "Live Jobs", value: data?.statusSummary?.liveJobs ?? 0 },
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
          <p className="section-desc">Here’s a live overview of Rozgar Mitra India.</p>
        </div>
        <div className="dashboard-actions">
          <button className="btn-search" type="button" onClick={() => onNavigate?.("jobs")}>Review Jobs</button>
          <button className="btn-secondary" type="button" onClick={() => onNavigate?.("rooms")}>Review Rooms</button>
        </div>
      </div>

      {error ? <div className="login-error">{error}</div> : null}

      <div className="dashboard-grid dashboard-grid-overview">
        {overviewCards.map((card) => (
          <button key={card.title} type="button" className="dashboard-card dashboard-card-small dashboard-metric-card" onClick={() => onNavigate?.(card.action)}>
            <div className="dashboard-card-top">
              <span className={`metric-icon ${card.tone}`}><card.icon size={21} /></span>
              <ArrowUpRight className="metric-arrow" size={18} />
            </div>
            <span className="dashboard-card-label">{card.title}</span>
            <p className="dashboard-summary-value">{card.value}</p>
            <span className="metric-note">{card.note}</span>
          </button>
        ))}
      </div>

      <div className="dashboard-grid dashboard-quick-grid">
        {[
          { label: "Pending Jobs", value: data?.statusSummary?.pendingJobs ?? 0, action: "jobs" },
          { label: "Pending Rooms", value: data?.statusSummary?.pendingRooms ?? 0, action: "rooms" },
          { label: "Open Complaints", value: data?.statusSummary?.openComplaints ?? 0, action: "complaints" },
          { label: "Pending Users", value: data?.statusSummary?.pendingUsers ?? 0, action: "candidates" },
        ].map((item) => (
          <div key={item.label} className="dashboard-card dashboard-card-quick" onClick={() => onNavigate?.(item.action)}>
            <div className="dashboard-card-top">
              <span>{item.label}</span>
              <ArrowUpRight className="metric-arrow" size={18} />
            </div>
            <div className="dashboard-summary-value">{item.value}</div>
            <p className="dashboard-card-subtitle">Tap to review</p>
          </div>
        ))}
      </div>

      <div className="dashboard-grid dashboard-main-grid">
        <div className="dashboard-card dashboard-card-medium">
          <div className="dashboard-card-top">
            <span>Live Listings</span>
            <span className="dashboard-card-dot">Jobs vs rooms</span>
          </div>
          <div className="dashboard-donut-panel">
            <div className="donut-chart" style={{ background: `conic-gradient(var(--green) 0 ${donutPercent}%, var(--gray-100) ${donutPercent}% 100%)` }}>
              <span>{donutPercent}%</span>
            </div>
            <div className="donut-meta">
              <div><span className="legend-dot green"></span>{liveJobs} Live Jobs</div>
              <div><span className="legend-dot blue"></span>{liveRooms} Live Rooms</div>
            </div>
          </div>
        </div>

        <div className="dashboard-card dashboard-card-medium">
          <div className="dashboard-card-top">
            <span>Platform Growth</span>
            <span className="dashboard-card-dot">This year</span>
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
          <span className="dashboard-card-dot"><Clock3 size={17} /></span>
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
