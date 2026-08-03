import { useState } from "react";
import { apiFetch, getSession } from "../../utils/auth.js";
import { useToast } from "../../contexts/ToastContext.jsx";

export default function RoomOwnerSettings() {
  const session = getSession();
  const user = session?.user || session || {};
  const [propertyName, setPropertyName] = useState(user.propertyName || "");
  const [email, setEmail] = useState(user.email || "");
  const [mobile, setMobile] = useState(user.mobile || user.phone || "");
  const [address, setAddress] = useState(user.propertyAddress || user.address || "");
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
          fullName: propertyName,
          email,
          mobile,
        }),
      });
      setMessage("Room owner settings updated successfully.");
      toast.show("Settings updated", "success");
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
          <div className="section-label">Room Owner Settings</div>
          <h1 className="section-title">Account Settings</h1>
          <p className="section-desc">Update your room owner contact details and property information.</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSave}>
        {error ? <div className="login-error">{error}</div> : null}
        {message ? <div className="login-success">{message}</div> : null}

        <div className="form-group">
          <label className="form-label">Property Name</label>
          <input className="form-input" value={propertyName} onChange={(e) => setPropertyName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" value={mobile} onChange={(e) => setMobile(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Address</label>
          <input className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <button className="btn-primary" type="submit" disabled={loading}>{loading ? "Saving..." : "Save Settings"}</button>
      </form>
    </section>
  );
}
