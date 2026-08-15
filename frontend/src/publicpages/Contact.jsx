import { useState } from "react";
import { apiFetch } from "../utils/auth.js";

const initialForm = { name: "", email: "", mobile: "", subject: "", message: "" };

export default function Contact() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await apiFetch("/contact", { method: "POST", body: JSON.stringify(form) });
      setSuccess(`${result.message} Reference: ${result.data?.referenceId || "-"}`);
      setForm(initialForm);
    } catch (err) {
      setError(err.message || "Unable to send your message.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="simple-page">
      <form className="info-card" onSubmit={submit}>
        <div className="section-label">Contact</div>
        <h1 className="section-title">संपर्क करें / Contact Us</h1>
        <p className="section-desc">Support, verification help, company hiring and room listing assistance.</p>
        {error ? <div className="login-error" style={{ marginTop: 20 }}>{error}</div> : null}
        {success ? <div className="login-success" style={{ marginTop: 20 }}>{success}</div> : null}
        <div className="form-row" style={{ marginTop: 24 }}>
          <input className="form-input" value={form.name} onChange={update("name")} placeholder="Name / नाम" minLength={2} maxLength={100} required />
          <input className="form-input" type="email" value={form.email} onChange={update("email")} placeholder="Email ID / ईमेल" required />
        </div>
        <div className="form-row" style={{ marginTop: 16 }}>
          <input className="form-input" type="tel" value={form.mobile} onChange={update("mobile")} placeholder="Mobile / मोबाइल" minLength={7} maxLength={20} required />
          <input className="form-input" value={form.subject} onChange={update("subject")} placeholder="Subject / विषय" minLength={3} maxLength={150} required />
        </div>
        <textarea className="form-textarea" style={{ marginTop: 16 }} value={form.message} onChange={update("message")} placeholder="Message / संदेश" minLength={10} maxLength={5000} required />
        <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: 16 }}>{loading ? "Sending..." : "Send Message"}</button>
      </form>
    </section>
  );
}
