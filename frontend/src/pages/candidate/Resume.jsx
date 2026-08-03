import { useState } from "react";
import { useToast } from "../../contexts/ToastContext.jsx";
import { apiUpload, getSession } from "../../utils/auth.js";

export default function Resume() {
  const [resumeFile, setResumeFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const toast = useToast();
  const user = getSession()?.user || {};

  async function uploadResume() {
    if (!resumeFile) return;
    const form = new FormData();
    form.append("file", resumeFile);

    setUploading(true);
    setError("");
    setMessage("");

    try {
      await apiUpload("/upload/resume", form);
      setMessage("Resume uploaded successfully.");
      toast.show("Resume uploaded", "success");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Resume</div>
          <h1 className="section-title">Resume Preview</h1>
          <p className="section-desc">View and upload your latest resume.</p>
        </div>
      </div>

      <div className="form-card">
        {error ? <div className="login-error">{error}</div> : null}
        {message ? <div className="login-success">{message}</div> : null}

        {user.resume?.url ? (
          <div className="detail-list">
            <p><strong>Current resume:</strong></p>
            <a className="btn-secondary" href={user.resume.url} target="_blank" rel="noreferrer">Open resume</a>
          </div>
        ) : (
          <p className="detail-desc">No resume has been uploaded yet.</p>
        )}

        <div className="form-group">
          <label className="form-label">Upload New Resume</label>
          <input className="form-input" type="file" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
        </div>

        <button className="btn-search" type="button" disabled={uploading || !resumeFile} onClick={uploadResume}>
          {uploading ? "Uploading..." : "Upload Resume"}
        </button>
      </div>
    </section>
  );
}
