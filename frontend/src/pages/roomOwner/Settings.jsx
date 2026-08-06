import { useState } from "react";
import { ArrowLeft, Building2, Mail, MapPin, Phone, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { apiFetch, getSession } from "../../utils/auth.js";
import { useToast } from "../../contexts/ToastContext.jsx";

export default function RoomOwnerSettings() {
  const session = getSession();
  const user = session?.user || session || {};
  const [propertyName, setPropertyName] = useState(user.propertyName || user.fullName || "");
  const [email, setEmail] = useState(user.email || "");
  const [mobile, setMobile] = useState(user.mobile || user.phone || "");
  const [address, setAddress] = useState(user.propertyAddress || user.address || "");
  const [about, setAbout] = useState(user.propertyDescription || user.about || "");
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
          propertyName,
          email,
          mobile,
          phone: mobile,
          address,
          propertyAddress: address,
          about,
          propertyDescription: about,
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
          <p className="section-desc">Keep owner identity, property profile, and contact details accurate for candidate trust.</p>
        </div>
        <Link className="btn-secondary" to="/room-owner/profile"><ArrowLeft size={16} />Profile</Link>
      </div>

      <form className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]" onSubmit={handleSave}>
        <div className="form-card">
          {error ? <div className="login-error">{error}</div> : null}
          {message ? <div className="login-success">{message}</div> : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field icon={Building2} label="Property Name">
              <input className="form-input" value={propertyName} onChange={(e) => setPropertyName(e.target.value)} placeholder="Sharma PG / Sunrise Rooms" required />
            </Field>
            <Field icon={Mail} label="Email">
              <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@example.com" required />
            </Field>
            <Field icon={Phone} label="Phone">
              <input className="form-input" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="+91 98xxxxxx" />
            </Field>
            <Field icon={MapPin} label="Address">
              <input className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Property address" />
            </Field>
            <label className="form-group sm:col-span-2">
              <span className="form-label">Property Description</span>
              <textarea className="form-input" value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Safety, property type, locality, and candidate-friendly details..." />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-5">
            <button className="btn-primary" type="submit" disabled={loading}><Save size={16} />{loading ? "Saving..." : "Save Settings"}</button>
            <Link className="btn-secondary" to="/room-owner/dashboard">Back to dashboard</Link>
          </div>
        </div>

        <aside className="form-card h-fit">
          <div className="section-label">Preview</div>
          <h2 className="mt-3 font-display text-2xl font-bold">{propertyName || "Property name"}</h2>
          <p className="mt-3 detail-desc">{about || "Your property summary will appear here."}</p>
          <div className="mt-5 grid gap-3 text-sm">
            <span className="rounded-xl border border-border bg-surface p-3"><b>Email</b><br />{email || "-"}</span>
            <span className="rounded-xl border border-border bg-surface p-3"><b>Phone</b><br />{mobile || "-"}</span>
            <span className="rounded-xl border border-border bg-surface p-3"><b>Address</b><br />{address || "-"}</span>
          </div>
        </aside>
      </form>
    </section>
  );
}

function Field({ icon: Icon, label, children }) {
  return (
    <label className="form-group">
      <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-muted-foreground">
        <Icon size={14} className="text-signal" />{label}
      </span>
      {children}
    </label>
  );
}
