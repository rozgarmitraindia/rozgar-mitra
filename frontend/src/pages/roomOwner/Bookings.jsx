import { useEffect, useState } from "react";
import { fetchRoomOwnerBookings } from "./roomOwnerApi.js";

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const items = await fetchRoomOwnerBookings();
        setBookings(items);
      } catch (err) {
        console.error(err);
        setError(err.message || "Unable to load bookings.");
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
          <div className="section-label">Bookings</div>
          <h1 className="section-title">Confirmed Bookings</h1>
          <p className="section-desc">View all confirmed room bookings and completed visits.</p>
        </div>
      </div>

      {error ? <div className="login-error">{error}</div> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Room</th>
              <th>Status</th>
              <th>Visit Date</th>
              <th>Requested On</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5">Loading bookings…</td></tr>
            ) : bookings.length ? bookings.map((item) => (
              <tr key={item._id}>
                <td>{item.user?.fullName || item.user?.email || "Candidate"}</td>
                <td>{item.room?.propertyName || item.room?.title || "Room"}</td>
                <td>{item.status || "pending"}</td>
                <td>{item.visitDate || "Not scheduled"}</td>
                <td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}</td>
              </tr>
            )) : (
              <tr><td colSpan="5">No bookings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
