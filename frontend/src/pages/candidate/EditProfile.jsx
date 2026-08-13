import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, setSession, apiFetch, apiUpload } from "../../utils/auth.js";
import { useToast } from "../../contexts/ToastContext.jsx";

export default function EditProfile() {
  const navigate = useNavigate();
  const toast = useToast();
  const [profileFile, setProfileFile] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const user = getSession()?.user || {};
  const [companyPreferences, setCompanyPreferences] = useState((user.companyPreferences || []).join(", "));
  const profileRef = useRef(null);
  const resumeRef = useRef(null);

  async function handleUpload(type, file) {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    setUploading(true);
    setError("");
    try {
      const path = type === "resume" ? "/upload/resume" : "/upload/profile";
      await apiUpload(path, form);
      setMessage(`${type === "resume" ? "Resume" : "Profile photo"} uploaded successfully.`);
      toast.show(`${type === "resume" ? "Resume" : "Profile photo"} uploaded`, "success");
      navigate("/profile");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function savePreferences(event) {
    event.preventDefault();
    setUploading(true);
    setError("");
    try {
      const result = await apiFetch("/user/profile", {
        method: "PATCH",
        body: JSON.stringify({ companyPreferences: companyPreferences.split(",").map((name) => name.trim()).filter(Boolean) }),
      });
      const updatedUser = result.data?.user;
      const session = getSession();
      if (updatedUser && session) setSession({ ...session, user: updatedUser }, localStorage.getItem("rozgar_session") !== null);
      setMessage("Company preferences updated successfully.");
      toast.show("Company preferences updated", "success");
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
          <div className="section-label">Edit Profile</div>
          <h1 className="section-title">Update your account</h1>
          <p className="section-desc">You can upload your resume and profile photo here.</p>
        </div>
      </div>
      <div className="form-card">
        {error ? <div className="login-error">{error}</div> : null}
        {message ? <div className="login-success">{message}</div> : null}

        <div className="form-group">
          <label className="form-label">Profile Photo</label>
          <input ref={profileRef} className="form-input" type="file" accept="image/*" onChange={(e) => setProfileFile(e.target.files?.[0] || null)} />
          <button className="btn-search" type="button" disabled={uploading || !profileFile} onClick={() => handleUpload("profile", profileFile)}>
            {uploading ? "Uploading..." : "Upload Profile Photo"}
          </button>
        </div>

        <div className="form-group">
          <label className="form-label">Resume Upload</label>
          <input ref={resumeRef} className="form-input" type="file" accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
          <button className="btn-search" type="button" disabled={uploading || !resumeFile} onClick={() => handleUpload("resume", resumeFile)}>
            {uploading ? "Uploading..." : "Upload Resume"}
          </button>
        </div>

        <form className="form-group" style={{ marginTop: 24 }} onSubmit={savePreferences}>
          <label className="form-label">Preferred companies</label>
          <input className="form-input" value={companyPreferences} onChange={(event) => setCompanyPreferences(event.target.value)} placeholder="Company names, comma separated" required />
          <p className="detail-desc">Admin uses your skills and these preferences to create matching candidate groups.</p>
          <button className="btn-search" disabled={uploading} type="submit">{uploading ? "Saving..." : "Save Preferences"}</button>
        </form>
      </div>
    </section>
  );
}
