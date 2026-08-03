import { Link } from "react-router-dom";
import { getSession } from "../../utils/auth.js";

export default function EmployerProfile() {
  const session = getSession();
  const user = session?.user || session || {};

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Employer Profile</div>
          <h1 className="section-title">Company Information</h1>
          <p className="section-desc">Review your employer account details and company profile information.</p>
        </div>
        <Link className="btn-search" to="/employer/settings">Edit Settings</Link>
      </div>

      <div className="form-card profile-grid">
        <div className="profile-card">
          <div className="detail-list">
            <p><strong>Company</strong></p>
            <p><strong>ID:</strong> {user.immutableId || "-"}</p>
            <p><strong>Company:</strong> {user.companyName || user.fullName || "-"}</p>
            <p><strong>Email:</strong> {user.companyEmail || user.email || "-"}</p>
            <p><strong>Phone:</strong> {user.companyPhone || user.mobile || user.phone || "-"}</p>
            <p><strong>Location:</strong> {user.companyLocation || user.address || "-"}</p>
            <p><strong>Role:</strong> {user.role || "employer"}</p>
            <p><strong>Status:</strong> {user.status || "Active"}</p>
          </div>
        </div>

        <div className="profile-card">
          <div className="section-label">About</div>
          <p className="detail-desc">{user.companyDescription || user.about || "No company description available."}</p>
          <div className="section-label" style={{ marginTop: 20 }}>Recent Activity</div>
          <p className="detail-desc">Use dashboard shortcuts to post jobs, review applications, and manage your hiring flow.</p>
        </div>
      </div>
    </section>
  );
}
