import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchRoomOwnerRooms } from "./roomOwnerApi.js";

export default function RoomOwnerRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const items = await fetchRoomOwnerRooms();
        setRooms(items);
      } catch (err) {
        console.error(err);
        setError(err.message || "Unable to load rooms.");
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
          <div className="section-label">My Rooms</div>
          <h1 className="section-title">Room Listings</h1>
          <p className="section-desc">Manage your room and PG listings submitted for admin review or live for booking.</p>
        </div>
        <Link className="btn-search" to="/post-room">Add New Room</Link>
      </div>

      {error ? <div className="login-error">{error}</div> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Rent</th>
              <th>Posted</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5">Loading rooms…</td></tr>
            ) : rooms.length ? rooms.map((room) => (
              <tr key={room._id}>
                <td>{room.propertyName || room.title || "Untitled"}</td>
                <td>{room.status || "pending"}</td>
                <td>{room.rent || "Not set"}</td>
                <td>{room.createdAt ? new Date(room.createdAt).toLocaleDateString() : "-"}</td>
                <td>{room.status === "pending" ? "Pending review" : <Link className="btn-secondary" to={`/rooms/${room._id}`}>View</Link>}</td>
              </tr>
            )) : (
              <tr><td colSpan="5">No room listings yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
