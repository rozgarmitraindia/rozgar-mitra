import { Link } from "react-router-dom";
import { getSession } from "../../utils/auth.js";

export default function RoomOwnerProfile() {
  const session = getSession();
  const user = session?.user || session || {};

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Room Owner Profile</div>
          <h1 className="section-title">Property Owner Details</h1>
          <p className="section-desc">Your room owner account and property profile information appear here.</p>
        </div>
        <Link className="btn-search" to="/room-owner/settings">Edit Settings</Link>
      </div>

      <div className="form-card profile-grid">
        <div className="profile-card">
          <div className="detail-list">
            <p><strong>Owner ID:</strong> {user.immutableId || "-"}</p>
            <p><strong>Name:</strong> {user.fullName || user.propertyName || "-"}</p>
            <p><strong>Property:</strong> {user.propertyName || "-"}</p>
            <p><strong>Email:</strong> {user.email || "-"}</p>
            <p><strong>Phone:</strong> {user.mobile || user.phone || "-"}</p>
            <p><strong>Location:</strong> {user.propertyAddress || user.address || "-"}</p>
            <p><strong>Role:</strong> {user.role || "roomOwner"}</p>
            <p><strong>Status:</strong> {user.status || "Active"}</p>
          </div>
        </div>

        <div className="profile-card">
          <div className="section-label">Property Summary</div>
          <p className="detail-desc">{user.propertyDescription || user.about || "No property description available."}</p>
          <div className="section-label" style={{ marginTop: 20 }}>Next Steps</div>
          <p className="detail-desc">Use the dashboard to post rooms, review visit requests, and manage confirmed bookings.</p>
        </div>
      </div>
    </section>
  );
}
