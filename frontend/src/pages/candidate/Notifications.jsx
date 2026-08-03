import { useEffect, useState } from "react";
import { fetchNotifications } from "./candidateApi.js";

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const items = await fetchNotifications();
        setNotifications(items);
      } catch (err) {
        setError(err.message || "Unable to load notifications.");
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
          <div className="section-label">Notifications</div>
          <h1 className="section-title">My Notifications</h1>
          <p className="section-desc">Recent system and account updates are listed here.</p>
        </div>
      </div>

      {error ? <div className="login-error">{error}</div> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Channel</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4">Loading notifications...</td></tr>
            ) : notifications.length ? notifications.map((item) => (
              <tr key={item._id}>
                <td>{item.title || "Notification"}</td>
                <td>{item.channel}</td>
                <td>{item.status}</td>
                <td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}</td>
              </tr>
            )) : (
              <tr><td colSpan="4">No notifications available right now.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
