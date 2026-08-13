import { useEffect, useRef, useState } from "react";
import { getSession } from "../../utils/auth.js";
import { useToast } from "../../contexts/ToastContext.jsx";
import { adminFetch } from "./adminApi.js";

export default function Settings() {
  const session = getSession();
  const toast = useToast();
  const errorRef = useRef(null);
  const successRef = useRef(null);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminMobile, setAdminMobile] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [skillSuggestions, setSkillSuggestions] = useState([]);
  const [skillLoading, setSkillLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  useEffect(() => {
    if (success) successRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [success]);

  async function loadSkillSuggestions() {
    setSkillLoading(true);
    try {
      const result = await adminFetch("/admin/skills?status=pending");
      const pending = result?.data?.pending || result?.pending || [];
      setSkillSuggestions(pending);
    } catch (err) {
      setSkillSuggestions([]);
      toast.show(err.message || "Unable to load skill suggestions", "error");
    } finally {
      setSkillLoading(false);
    }
  }

  useEffect(() => {
    loadSkillSuggestions();
  }, []);

  async function handleSkillDecision(id, status) {
    try {
      const result = await adminFetch(`/admin/skills/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.show(result.message || "Skill updated", status === "approved" ? "success" : "info");
      setSkillSuggestions((current) => current.filter((item) => item._id !== id));
    } catch (err) {
      toast.show(err.message || "Unable to update skill", "error");
    }
  }

  async function createAdmin(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!adminName || !adminEmail || !adminMobile || !adminPassword) {
      setError("Please fill all admin fields before saving.");
      return;
    }

    setLoading(true);
    try {
      await adminFetch("/admin/admins", {
        method: "POST",
        body: JSON.stringify({
          fullName: adminName,
          email: adminEmail,
          mobile: adminMobile,
          password: adminPassword,
        }),
      });
      setSuccess("Admin account created and credentials sent by email.");
      toast.show("Admin account created", "success");
      setAdminName("");
      setAdminEmail("");
      setAdminMobile("");
      setAdminPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="form-card">
      <div className="section-label">Settings</div>
      <h1 className="form-title">Platform Settings</h1>
      <div className="detail-list">
        <p><strong>Logged in as:</strong> {session?.name || session?.user?.email || "Admin"}</p>
        <p><strong>Role:</strong> {session?.role || "admin"}</p>
        <p><strong>Email:</strong> {session?.user?.email || "-"}</p>
        <p><strong>Notifications:</strong> Admin can send announcements and review platform settings here.</p>
      </div>

      <div className="sidebar-divider" style={{ margin: "24px 0" }} />

      <div className="section-label">Pending Skill Suggestions</div>
      <div className="form-card" style={{ marginBottom: 24 }}>
        {skillLoading ? (
          <p className="text-sm text-muted-foreground">Loading suggestions...</p>
        ) : skillSuggestions.length ? (
          <div className="space-y-3">
            {skillSuggestions.map((item) => (
              <div key={item._id} className="flex flex-col gap-3 rounded-xl border border-border bg-muted p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-semibold text-foreground">{item.displayName || item.name}</div>
                  <div className="text-xs text-muted-foreground">Suggested by candidate • {new Date(item.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary" onClick={() => handleSkillDecision(item._id, "approved")}>Approve</button>
                  <button type="button" className="btn-outline" onClick={() => handleSkillDecision(item._id, "rejected")}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No pending skill suggestions right now.</p>
        )}
      </div>

      <div className="section-label">Create Admin</div>
      <form className="form-card" onSubmit={createAdmin}>
        {error ? <div ref={errorRef} className="login-error">{error}</div> : null}
        {success ? <div ref={successRef} className="login-success">{success}</div> : null}

        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input className="form-input" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Admin full name" required />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@example.com" required />
        </div>
        <div className="form-group">
          <label className="form-label">Mobile Number</label>
          <input className="form-input" value={adminMobile} onChange={(e) => setAdminMobile(e.target.value)} placeholder="10 digit mobile" required />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Set a strong password" required />
        </div>

        <button className="btn-primary" type="submit" disabled={loading}>{loading ? "Saving..." : "Create Admin"}</button>
      </form>
    </section>
  );
}
