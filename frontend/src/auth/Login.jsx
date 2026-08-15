import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { apiFetch, API_BASE, setSession } from "../utils/auth.js";
import { useToast } from "../contexts/ToastContext.jsx";
import { Button } from "../components/ui/button.jsx";
import { cn } from "../lib/utils.js";

const roleMap = {
  candidate: "Candidate",
  employer: "Company",
  roomOwner: "Room Owner",
  admin: "Admin",
};

const roleRedirects = {
  candidate: "/dashboard",
  employer: "/employer/dashboard",
  roomOwner: "/room-owner/dashboard",
  admin: "/admin",
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const errorRef = useRef(null);
  const successRef = useRef(null);
  const toast = useToast();
  const [role, setRole] = useState(location.state?.role || "candidate");
  const [error, setError] = useState(location.state?.error || "");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const successMessage = location.state?.success || "";

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  useEffect(() => {
    if (successMessage) successRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [successMessage]);

  async function login(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const identifier = form.get("identifier");
    const password = form.get("password");
    const remember = form.get("remember") === "on";

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
      setSession(sessionObj, remember);
      toast.show("Login successful", "success");
      navigate(location.state?.from || roleRedirects[data.user.role] || "/", { replace: true });
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function continueWithGoogle() {
    const redirectTo = location.state?.from || roleRedirects[role] || "/";
    window.location.href = `${API_BASE}/auth/google?role=${encodeURIComponent(role)}&redirectTo=${encodeURIComponent(redirectTo)}`;
  }

  return (
    <section className="mesh-bg min-h-[calc(100vh-8rem)] border-b border-border px-4 py-12 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <ShieldCheck className="size-3.5 text-verified" />
            Secure account access
          </div>
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight sm:text-5xl">Login to continue your Rozgar Mitra journey</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">Access candidate, company, room owner, or admin workflows with verified credentials and role-based routing.</p>
        </div>

        <form className="rounded-3xl border border-border bg-card p-6 shadow-lift sm:p-8" onSubmit={login}>
          {successMessage ? <div ref={successRef} className="mb-5 rounded-2xl border border-verified/20 bg-verified/10 p-4 text-sm font-semibold text-foreground">{successMessage}</div> : null}
          {error ? <div ref={errorRef} className="mb-5 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{error}</div> : null}

          <div>
            <label className="text-sm font-semibold">Login as</label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(roleMap).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRole(value)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                    role === value ? "border-signal bg-signal/15 text-foreground" : "border-border bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-semibold">Email ID / Mobile Number</label>
            <div className="relative mt-2">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input className="h-12 w-full rounded-xl border border-border bg-muted px-3 pl-10 text-sm outline-none transition focus:ring-2 focus:ring-signal" name="identifier" placeholder="email@example.com or 10 digit mobile" required />
            </div>
          </div>

          <div className="mt-5">
            <label className="text-sm font-semibold">Password</label>
            <div className="relative mt-2">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input className="h-12 w-full rounded-xl border border-border bg-muted px-3 pl-10 pr-10 text-sm outline-none transition focus:ring-2 focus:ring-signal" name="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" required />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
            <label className="inline-flex items-center gap-2 text-muted-foreground">
              <input className="accent-signal" type="checkbox" name="remember" />
              Remember me
            </label>
            <Link className="font-semibold text-signal" to="/forgot-password">Forgot Password?</Link>
          </div>

          <Button className="mt-6 w-full" variant="signal" size="xl" disabled={loading}>
            {loading ? "Please wait..." : "Login"}
          </Button>
          <Button className="mt-3 w-full" variant="outline" size="xl" type="button" onClick={continueWithGoogle}>
            Continue with Google
          </Button>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            New on Rozgar Mitra? <Link className="font-semibold text-signal" to="/register">Create account</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
