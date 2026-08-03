import { getSession, apiFetch } from "../../utils/auth.js";
import { useState } from "react";
import { useToast } from "../../contexts/ToastContext.jsx";

export default function Settings() {
  const session = getSession();
  const toast = useToast();
  const [name, setName] = useState(session?.name || "");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [mobile, setMobile] = useState(session?.user?.mobile || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSave(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      await apiFetch("/user/profile", {
        method: "PATCH",
        body: JSON.stringify({ fullName: name, email, mobile }),
      });
      setMessage("Settings updated successfully.");
      toast.show("Profile settings updated", "success");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Account Settings</div>
          <h1 className="section-title">Candidate Settings</h1>
          <p className="section-desc">Update contact details or request account changes.</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSave}>
        {error ? <div className="login-error">{error}</div> : null}
        {message ? <div className="login-success">{message}</div> : null}

        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Mobile Number</label>
          <input className="form-input" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
        </div>

        <button className="btn-primary" type="submit" disabled={loading}>{loading ? "Saving..." : "Save Settings"}</button>
      </form>
    </section>
  );
}
