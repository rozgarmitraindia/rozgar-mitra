import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCandidateVisitRequests } from "./candidateApi.js";

const nice = (value) => String(value || "pending").replace(/([A-Z])/g, " $1").replace(/\b\w/g, (letter) => letter.toUpperCase());
const date = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Not selected";

export default function CandidateVisitRequests() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchCandidateVisitRequests().then(setItems).catch((err) => setError(err.message || "Unable to load visit requests")).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dashboard-card"><p>Loading visit requests...</p></div>;

  return (
    <div className="dashboard-stack">
      <div className="dashboard-card">
        <h2>My Visit Requests</h2>
        <p>Track every room visit request and its latest status.</p>
      </div>
      {error && <div className="dashboard-card"><p className="form-error">{error}</p></div>}
      {!error && items.length === 0 && (
        <div className="dashboard-card empty-state"><h3>No visit requests yet</h3><p>Browse rooms and request a visit.</p><Link className="primary-btn" to="/rooms">Browse Rooms</Link></div>
      )}
      {items.map((request) => {
        const room = request.room || {};
        const owner = request.owner || {};
        return (
          <article className="dashboard-card" key={request._id}>
            <div className="section-header">
              <div><h3>{room.title || room.propertyName || "Room"}</h3><p>{[room.locality, room.city].filter(Boolean).join(", ") || room.address || "Location unavailable"}</p></div>
              <span className="status-badge">{request.adminReviewStatus === "pending" ? "Waiting for Admin" : request.adminReviewStatus === "rejected" ? "Rejected by Admin" : nice(request.visitStatus || request.status)}</span>
            </div>
            <div className="details-grid">
              <p><strong>Room ID:</strong> {room.publicId || room.roomId || "-"}</p>
              <p><strong>Requested visit:</strong> {date(request.visitDate)} {request.visitTime || ""}</p>
              <p><strong>Request sent:</strong> {date(request.createdAt)}</p>
              <p><strong>Booking status:</strong> {nice(request.bookingStatus || "notBooked")}</p>
              <p><strong>Admin review:</strong> {nice(request.adminReviewStatus || "pending")}</p>
              <p><strong>Owner:</strong> {owner.propertyName || owner.fullName || "-"}</p>
              <p><strong>Contact:</strong> {request.contactUnlocked ? (owner.mobile || owner.phone || owner.email || "-") : "🔒 Locked until room owner accepts"}</p>
            </div>
            {request.message && <p><strong>Your message:</strong> {request.message}</p>}
            {room._id && room.status === "live" && <Link className="secondary-btn" to={`/rooms/${room._id}`}>View Room</Link>}
          </article>
        );
      })}
    </div>
  );
}
