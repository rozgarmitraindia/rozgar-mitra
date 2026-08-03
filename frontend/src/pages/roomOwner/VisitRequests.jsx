import { useEffect, useState } from "react";
import { fetchRoomOwnerVisitRequests, respondToVisitRequest } from "./roomOwnerApi.js";
import { useToast } from "../../contexts/ToastContext.jsx";

export default function VisitRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const toast = useToast();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const items = await fetchRoomOwnerVisitRequests();
        setRequests(items);
      } catch (err) {
        console.error(err);
        setError(err.message || "Unable to load requests.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleResponse(requestId, action) {
    setActionLoading(requestId);
    try {
      await respondToVisitRequest(requestId, { action });
      setRequests((items) => items.map((item) => (
        item._id === requestId ? { ...item, status: action === "accept" ? "confirmed" : "rejected" } : item
      )));
      toast.show(`Request ${action}ed`, "success");
    } catch (err) {
      toast.show(err.message || "Unable to update request.", "error");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Visit Requests</div>
          <h1 className="section-title">Booked Visits</h1>
          <p className="section-desc">Review booking requests from candidates and accept or reject visits.</p>
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
              <th>Requested On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5">Loading requests…</td></tr>
            ) : requests.length ? requests.map((item) => (
              <tr key={item._id}>
                <td>{item.user?.fullName || item.user?.email || "Candidate"}</td>
                <td>{item.room?.propertyName || item.room?.title || "Room"}</td>
                <td>{item.status || "pending"}</td>
                <td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-"}</td>
                <td>
                  <button className="btn-secondary" type="button" disabled={actionLoading === item._id || item.status !== "pending"} onClick={() => handleResponse(item._id, "accept")}>Accept</button>
                  <button className="btn-search" type="button" disabled={actionLoading === item._id || item.status !== "pending"} onClick={() => handleResponse(item._id, "reject")}>Reject</button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5">No visit requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
