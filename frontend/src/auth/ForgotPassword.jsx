import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/auth.js";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=email,2=otp,3=new-password,4=success
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer = null;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  async function sendOtp() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      setMessage(res.message || "If an account exists, reset OTP sent to email.");
      setStep(2);
      setCountdown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await apiFetch("/auth/verify-reset-otp", { method: "POST", body: JSON.stringify({ email, otp }) });
      setMessage(res.message || "OTP valid");
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (countdown > 0) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      setMessage(res.message || "OTP resent");
      setCountdown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitNewPassword() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await apiFetch("/auth/reset-password", { method: "POST", body: JSON.stringify({ email, otp, password }) });
      setMessage(res.message || "Password reset successful");
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function renderOverlay() {
    if (step !== 4) return null;
    return (
      <div className="overlay success-overlay">
        <div className="overlay-card">
          <h2>Success / सफलता</h2>
          <p>{message || "Password updated successfully. / पासवर्ड सफलतापूर्वक अपडेट हुआ।"}</p>
          <button className="btn-primary" onClick={() => navigate("/login")}>Go to Login / लॉगिन पर जाएं</button>
        </div>
      </div>
    );
  }

  return (
    <section className="form-page">
      <div className="section-header">
        <div className="section-label">Forgot Password / पासवर्ड भूल गए</div>
        <h1 className="section-title">Password Reset / पासवर्ड रीसेट</h1>
        <p className="section-desc">Follow the steps to verify OTP and set a new password. / OTP सत्यापित करके नया पासवर्ड सेट करें।</p>
      </div>

      {error ? <div className="login-error">{error}</div> : null}
      {message ? <div className="generated-id"><span>Status</span><input value={message} readOnly /></div> : null}

      {step === 1 && (
        <form className="form-card animated-card" onSubmit={(e) => { e.preventDefault(); sendOtp(); }}>
          <div className="form-group"><label className="form-label">Email / ईमेल</label><input className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <button className="btn-primary" type="submit" disabled={loading}>{loading ? "Please wait..." : "Send Reset OTP / OTP भेजें"}</button>
        </form>
      )}

      {step === 2 && (
        <form className="form-card animated-card" onSubmit={(e) => { e.preventDefault(); verifyOtp(); }}>
          <div className="form-group"><label className="form-label">Email / ईमेल</label><input className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div className="form-group"><label className="form-label">OTP / ओटीपी</label><input className="form-input" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6 digit OTP" required /></div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" type="submit" disabled={loading || !otp}>{loading ? "Please wait..." : "Verify OTP / सत्यापित करें"}</button>
            <button className="btn-secondary" type="button" disabled={loading || countdown > 0} onClick={resendOtp}>{countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP / फिर से भेजें"}</button>
          </div>
        </form>
      )}

      {step === 3 && (
        <form className="form-card animated-card" onSubmit={(e) => { e.preventDefault(); submitNewPassword(); }}>
          <div className="form-group"><label className="form-label">Email / ईमेल</label><input className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} readOnly /></div>
          <div className="form-group"><label className="form-label">OTP / ओटीपी</label><input className="form-input" value={otp} onChange={(e) => setOtp(e.target.value)} readOnly /></div>
          <div className="form-group"><label className="form-label">New Password / नया पासवर्ड</label><input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <button className="btn-primary" type="submit" disabled={loading || !password}>{loading ? "Please wait..." : "Set New Password / नया पासवर्ड सेट करें"}</button>
        </form>
      )}

      {renderOverlay()}
    </section>
  );
}
