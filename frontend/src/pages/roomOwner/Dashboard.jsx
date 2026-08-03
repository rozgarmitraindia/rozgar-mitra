import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSession } from "../../utils/auth.js";
import { fetchRoomOwnerSummary } from "./roomOwnerApi.js";

export default function RoomOwnerDashboard() {
  const session = getSession();
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await fetchRoomOwnerSummary();
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
      pendingRooms: summary.statusCounts?.pending || 0,
      liveRooms: summary.statusCounts?.live || 0,
      rejectedRooms: summary.statusCounts?.rejected || 0,
      totalRequests: summary.requestCounts?.total || 0,
      confirmedRequests: summary.requestCounts?.confirmed || 0,
      rejectedRequests: summary.requestCounts?.rejected || 0,
    }),
    [summary]
  );

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Room Owner Dashboard</div>
          <h1 className="section-title">Welcome back, {session?.propertyName || session?.name || "Room Owner"}</h1>
          <p className="section-desc">Manage your room listings, visit requests, and bookings from one dashboard.</p>
        </div>
      </div>

      {error ? <div className="login-error">{error}</div> : null}

      <div className="dashboard-grid">
        {[
          { label: "Live Rooms", value: stats.liveRooms, link: "/room-owner/rooms" },
          { label: "Pending Rooms", value: stats.pendingRooms, link: "/room-owner/rooms" },
          { label: "Rejected Rooms", value: stats.rejectedRooms, link: "/room-owner/rooms" },
          { label: "Visit Requests", value: stats.totalRequests, link: "/room-owner/visit-requests" },
          { label: "Confirmed", value: stats.confirmedRequests, link: "/room-owner/visit-requests" },
          { label: "Rejected", value: stats.rejectedRequests, link: "/room-owner/visit-requests" },
        ].map((card) => (
          <Link key={card.label} to={card.link} className="dashboard-card dashboard-card-small">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </Link>
        ))}
      </div>

      <div className="dashboard-grid dashboard-main-grid">
        <div className="form-card">
          <div className="section-label">Quick Actions</div>
          <div className="quick-actions">
            <Link className="btn-search" to="/post-room">Post New Room</Link>
            <Link className="btn-secondary" to="/room-owner/rooms">Manage Rooms</Link>
            <Link className="btn-secondary" to="/room-owner/visit-requests">Review Visit Requests</Link>
          </div>
        </div>

        <div className="form-card">
          <div className="section-label">Latest Overview</div>
          {loading ? (
            <p className="section-desc">Loading your performance metrics…</p>
          ) : (
            <p className="section-desc">See live room status and booking request counts here.</p>
          )}
        </div>
      </div>
    </section>
  );
}
