import { getSession } from "../../utils/auth.js";
import { Link } from "react-router-dom";

export default function Profile() {
  const user = getSession()?.user || {};
  const documents = user.documents || [];

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Candidate Profile</div>
          <h1 className="section-title">My Profile</h1>
          <p className="section-desc">Profile information is shown from your current account details.</p>
        </div>
        <Link className="btn-search" to="/edit-profile">Edit Profile</Link>
      </div>

      <div className="form-card profile-grid">
        <div className="profile-card">
          <div className="profile-avatar" style={{ backgroundImage: user.profilePhoto ? `url(${user.profilePhoto.url})` : undefined }}>
            {!user.profilePhoto && <span>{(user.fullName || "C")[0]}</span>}
          </div>
          <div className="detail-list">
            <p><strong>ID:</strong> {user.immutableId || "-"}</p>
            <p><strong>Name:</strong> {user.fullName || "-"}</p>
            <p><strong>Email:</strong> {user.email || "-"}</p>
            <p><strong>Phone:</strong> {user.mobile || user.phone || "-"}</p>
            <p><strong>Address:</strong> {user.address || "-"}</p>
            <p><strong>Skills:</strong> {(user.skills || []).join(", ") || "-"}</p>
            <p><strong>Experience:</strong> {user.experience || "-"}</p>
            <p><strong>Availability:</strong> {user.availability || "-"}</p>
          </div>
        </div>

        <div className="profile-card">
          <div className="section-label">About</div>
          <p className="detail-desc">{user.about || "No description provided."}</p>
          <div className="section-label" style={{ marginTop: 20 }}>Resume Preview</div>
          {user.resume?.url ? (
            <a className="btn-secondary" href={user.resume.url} target="_blank" rel="noreferrer">Open Resume</a>
          ) : (
            <p className="detail-desc">No resume uploaded yet.</p>
          )}
          <div className="section-label" style={{ marginTop: 20 }}>Documents</div>
          {documents.length ? (
            <ul className="detail-list">
              {documents.map((doc, index) => (
                <li key={index}><a href={doc.url} target="_blank" rel="noreferrer">Document {index + 1}</a></li>
              ))}
            </ul>
          ) : (
            <p className="detail-desc">No documents uploaded.</p>
          )}
        </div>
      </div>
    </section>
  );
}
