import { useEffect, useState } from "react";
import { adminFetch } from "./adminApi.js";

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminFetch("/admin/dashboard/analytics")
      .then((result) => setData(result.data || result))
      .catch((err) => setError(err.message));
  }, []);

  const labels = data?.growth?.map((item) => item.month) || [];
  const metrics = data?.growth?.map((item) => item.users + item.jobs + item.rooms + item.applications) || [];

  return (
    <section className="form-card">
      <div className="section-label">Analytics</div>
      <h1 className="form-title">Platform Growth Overview</h1>
      {error ? <div className="login-error">{error}</div> : null}
      <div className="admin-chart">
        {metrics.map((value, index) => (
          <div key={labels[index] || index} title={`${labels[index] || "Month"}: ${value}`}>
            <span>{labels[index]}</span>
            <div style={{ height: `${Math.max(16, (value / (Math.max(...metrics) || 1)) * 150)}px` }} />
          </div>
        ))}
      </div>
      <div className="admin-stats" style={{ marginTop: 24 }}>
        <div className="category-card"><span className="cat-name-hi">{data?.statusSummary?.pendingUsers ?? 0}</span><span className="cat-name-en">Pending Users</span></div>
        <div className="category-card"><span className="cat-name-hi">{data?.statusSummary?.verifiedUsers ?? 0}</span><span className="cat-name-en">Verified Users</span></div>
        <div className="category-card"><span className="cat-name-hi">{data?.statusSummary?.pendingJobs ?? 0}</span><span className="cat-name-en">Pending Jobs</span></div>
        <div className="category-card"><span className="cat-name-hi">{data?.statusSummary?.pendingRooms ?? 0}</span><span className="cat-name-en">Pending Rooms</span></div>
      </div>
    </section>
  );
}
