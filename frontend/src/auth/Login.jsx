import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetch, setSession, API_BASE } from "../utils/auth.js";
import { useToast } from "../contexts/ToastContext.jsx";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

const roleMap = {
  candidate: "Candidate",
  employer: "Employer",
  roomOwner: "Room Owner",
  admin: "Admin",
};

const roleRedirects = {
  candidate: "/jobs",
  employer: "/post-job",
  roomOwner: "/post-room",
  admin: "/admin",
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const errorRef = useRef(null);
  const successRef = useRef(null);
  const suggestedRole = location.state?.role || "candidate";
  const successMessage = location.state?.success || "";
  const toast = useToast();
  const [error, setError] = useState(location.state?.error || "");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function login(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const role = form.get("role");
    const identifier = form.get("identifier");
    const password = form.get("password");
    const remember = form.get("remember") === "on" || form.get("remember") === "true";

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ role, identifier, password }),
      });
      const sessionObj = {
        token: data.token,
        refreshToken: data.refreshToken,
        role: data.user.role,
        identifier,
        name: data.user.fullName || data.user.companyName || data.user.propertyName || identifier || roleMap[role],
        user: data.user,
      };
      if (remember) {
        setSession(sessionObj, true);
      } else {
        setSession(sessionObj, false);
      }
      toast.show("Login successful", "success");
      const target = location.state?.from || roleRedirects[data.user.role] || "/";
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message);
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [error]);

  useEffect(() => {
    if (successMessage) {
      successRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [successMessage]);

  return (
    <section className="form-page">
      <div className="section-header">
        <div className="section-label">Login</div>
        <h1 className="section-title">Secure Login</h1>
        <p className="section-desc">Email OTP verification aur admin approval ke baad login allowed hoga.</p>
      </div>
      <form className="form-card animated-card" onSubmit={login}>
        {successMessage ? <div ref={successRef} className="login-success">{successMessage}</div> : null}
        {error ? <div ref={errorRef} className="login-error">{error}</div> : null}
        <div className="form-group">
          <label className="form-label">Login as</label>
          <select className="form-select" name="role" defaultValue={suggestedRole}>
            <option value="candidate">Candidate</option>
            <option value="employer">Employer</option>
            <option value="roomOwner">Room Owner</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Email ID / Mobile Number *</label>
          <div className="input-icon-group">
            <span className="input-icon"><Mail size={16} /></span>
            <input className="form-input" name="identifier" placeholder="email@example.com or 10 digit mobile" required />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Password *</label>
          <div className="input-icon-group password">
            <span className="input-icon"><Lock size={16} /></span>
            <input className="form-input" name="password" type={showPassword ? "text" : "password"} placeholder="Enter password" required />
            <button type="button" className="input-icon-button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div className="form-row" style={{ alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" name="remember" />
            <span style={{ fontSize: 13 }}>Remember me</span>
          </label>
        </div>
        <button className="btn-primary" disabled={loading}>{loading ? "Please wait..." : "Login"}</button>
        <button
          className="btn-secondary"
          type="button"
          style={{ width: "100%", marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          onClick={() => {
            const role = new FormData(document.querySelector("form")).get("role") || suggestedRole;
            const redirectTo = location.state?.from || "/";
            window.location.href = `${API_BASE}/auth/google?role=${encodeURIComponent(role)}&redirectTo=${encodeURIComponent(redirectTo)}`;
          }}
        >
          <svg width="18" height="18" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path fill="#4285f4" d="M533.5 278.4c0-17.4-1.4-34.1-4-50.4H272v95.4h147c-6.4 34.7-25.9 64.1-55 83.8v69.6h88.9c52-48 81.6-118.6 81.6-198.4z"/>
            <path fill="#34a853" d="M272 544.3c74 0 136.1-24.5 181.5-66.6l-88.9-69.6c-24.7 16.6-56.3 26.4-92.6 26.4-71 0-131.2-48-152.7-112.5H29.3v70.6C74.6 486.9 168.5 544.3 272 544.3z"/>
            <path fill="#fbbc04" d="M119.3 323.9c-10.6-31.9-10.6-66.1 0-98l-90-70.6C8.1 179.6 0 227.3 0 272s8.1 92.4 29.3 116.7l90-70.8z"/>
            <path fill="#ea4335" d="M272 104.6c39.9 0 75.8 13.7 104 40.6l78-78C408.1 24.5 346 0 272 0 168.5 0 74.6 57.4 29.3 144.5l90 70.6C140.8 152.6 201 104.6 272 104.6z"/>
          </svg>
          <span>Continue with Google</span>
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, fontSize: 13, fontWeight: 700 }}>
          <Link to="/forgot-password">Forgot Password</Link>
          <Link to="/join-free">Create Account</Link>
        </div>
      </form>
    </section>
  );
}
