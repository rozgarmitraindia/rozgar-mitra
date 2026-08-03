import { useState } from "react";
import { apiFetch, getSession } from "../../utils/auth.js";
import { useToast } from "../../contexts/ToastContext.jsx";

export default function EmployerSettings() {
  const session = getSession();
  const user = session?.user || session || {};
  const [companyName, setCompanyName] = useState(user.companyName || "");
  const [companyEmail, setCompanyEmail] = useState(user.companyEmail || user.email || "");
  const [companyPhone, setCompanyPhone] = useState(user.companyPhone || user.mobile || "");
  const [companyLocation, setCompanyLocation] = useState(user.companyLocation || user.address || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const toast = useToast();

  async function handleSave(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      await apiFetch("/user/profile", {
        method: "PATCH",
        body: JSON.stringify({
          fullName: companyName,
          email: companyEmail,
          mobile: companyPhone,
        }),
      });
      setMessage("Employer settings updated successfully.");
      toast.show("Employer settings updated", "success");
    } catch (err) {
      setError(err.message || "Unable to save settings.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-label">Employer Settings</div>
          <h1 className="section-title">Account Settings</h1>
          <p className="section-desc">Update your employer account contact details and company information.</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSave}>
        {error ? <div className="login-error">{error}</div> : null}
        {message ? <div className="login-success">{message}</div> : null}

        <div className="form-group">
          <label className="form-label">Company Name</label>
          <input className="form-input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Company Email</label>
          <input className="form-input" type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Company Phone</label>
          <input className="form-input" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Location</label>
          <input className="form-input" value={companyLocation} onChange={(e) => setCompanyLocation(e.target.value)} />
        </div>

        <button className="btn-primary" type="submit" disabled={loading}>{loading ? "Saving..." : "Save Settings"}</button>
      </form>
    </section>
  );
}
