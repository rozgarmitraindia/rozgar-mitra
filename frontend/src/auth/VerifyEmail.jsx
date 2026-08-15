import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiFetch } from "../utils/auth.js";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = location.state?.email || "";
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get("email") || initialEmail;
    const otpParam = params.get("otp") || "";
    if (emailParam) setEmail(emailParam);
    if (otpParam) setOtp(otpParam);
    if (emailParam && otpParam && !autoSubmitted) {
      setAutoSubmitted(true);
      submitVerify(emailParam, otpParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, autoSubmitted]);

  async function submitVerify(emailValue = email, otpValue = otp) {
    const normalizedEmail = String(emailValue || "").trim().toLowerCase();
    const normalizedOtp = String(otpValue || "").replace(/\D/g, "").slice(0, 6);
    if (!normalizedEmail || normalizedOtp.length !== 6) {
      setError("Please enter your email and complete 6-digit OTP.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await apiFetch("/auth/verify-email-otp", { method: "POST", body: JSON.stringify({ email: normalizedEmail, otp: normalizedOtp }) });
      setMessage(res.message || "Verified");
      setTimeout(() => navigate("/login", { state: { info: "Email verified successfully. You can login now." } }), 800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await apiFetch("/auth/resend-email-otp", { method: "POST", body: JSON.stringify({ email }) });
      setMessage(res.message || "OTP resent");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="form-page">
      <div className="section-header">
        <div>
          <div className="section-label">Verify Email / ईमेल सत्यापित करें</div>
          <h1 className="section-title">Account Verification / खाता सत्यापन</h1>
          <p className="section-desc">Enter the 6-digit OTP sent to your email. / ईमेल पर भेजा गया 6-अंकों का OTP दर्ज करें।</p>
        </div>
      </div>
      <form className="form-card animated-card" onSubmit={(e) => { e.preventDefault(); submitVerify(); }}>
        {error ? <div className="login-error">{error}</div> : null}
        {message ? <div className="generated-id"><span>Status</span><input value={message} readOnly /></div> : null}

        <div className="form-group"><label className="form-label">Email / ईमेल</label><input className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className="form-group"><label className="form-label">OTP / ओटीपी</label><input className="form-input" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6 digit OTP" inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={6} required /></div>
        <button className="btn-primary" type="submit" disabled={loading}>{loading ? "Please wait..." : "Verify Email / सत्यापित करें"}</button>
        <button className="btn-secondary" type="button" disabled={loading} style={{ marginTop: 10 }} onClick={resend}>Resend OTP / फिर से भेजें</button>
      </form>
    </section>
  );
}
